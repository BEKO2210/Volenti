import { and, eq, sql } from 'drizzle-orm';
import { withTenant } from '@/lib/db';
import { generations, artifacts, usageCounters, auditLog } from '@/lib/db/schema';
import { estimateCostCents } from '@/lib/ai/pricing';
import { MODELS } from '@/lib/ai/types';
import type { TextGenerator } from '@/lib/ai/text-generator';
import { currentPeriod, isWithinQuota, QuotaExceededError, type Plan } from '@/lib/billing/limits';

export interface CreateTextGenerationInput {
  tenantId: string;
  userId: string;
  plan: Plan;
  intent: string;
  generator: TextGenerator;
  /** Injectable clock for deterministic tests. */
  now?: Date;
}

export interface TextGenerationOutcome {
  generationId: string;
  artifactId: string;
  text: string;
  aiLabeled: true;
  model: string;
  tokenIn: number;
  tokenOut: number;
  costCents: number;
}

/**
 * Orchestrate a single text generation end to end:
 *   quota check → reserve slot + persist generation (running)
 *   → call the generator (network, outside the transaction)
 *   → persist artifact + usage + audit (completed) — or mark failed.
 *
 * All tenant-scoped writes run inside withTenant so Postgres RLS enforces
 * isolation. The generator is injected, so this is fully testable without an
 * API key.
 */
export async function createTextGeneration(
  input: CreateTextGenerationInput,
): Promise<TextGenerationOutcome> {
  const now = input.now ?? new Date();
  const period = currentPeriod(now);

  // 1. Reserve quota + create the generation row (status running).
  const generationId = await withTenant(input.tenantId, async (tx) => {
    const [counter] = await tx
      .select({ used: usageCounters.generationsCount })
      .from(usageCounters)
      .where(and(eq(usageCounters.tenantId, input.tenantId), eq(usageCounters.period, period)));

    const used = counter?.used ?? 0;
    if (!isWithinQuota(input.plan, used)) {
      throw new QuotaExceededError(input.plan, used);
    }

    // Reserve a slot up front so a tenant can never exceed its cap, even if the
    // generation later fails (cost protection, CLAUDE.md §11).
    await tx
      .insert(usageCounters)
      .values({ tenantId: input.tenantId, period, generationsCount: 1, tokensUsed: 0 })
      .onConflictDoUpdate({
        target: [usageCounters.tenantId, usageCounters.period],
        set: {
          generationsCount: sql`${usageCounters.generationsCount} + 1`,
          updatedAt: now,
        },
      });

    const [generation] = await tx
      .insert(generations)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        type: 'text',
        intentText: input.intent,
        status: 'running',
        model: MODELS.generator,
      })
      .returning({ id: generations.id });

    if (!generation) {
      throw new Error('Failed to persist generation.');
    }
    return generation.id;
  });

  // 2. Run the actual generation outside any transaction (network call).
  let result;
  try {
    result = await input.generator.generate(input.intent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await withTenant(input.tenantId, async (tx) => {
      await tx
        .update(generations)
        .set({ status: 'failed', error: message })
        .where(eq(generations.id, generationId));
      await tx.insert(auditLog).values({
        tenantId: input.tenantId,
        actorId: input.userId,
        action: 'generation.failed',
        target: generationId,
        meta: { type: 'text' },
      });
    });
    throw error;
  }

  // 3. Persist the artifact + usage + audit (status completed).
  const costCents = estimateCostCents(result.model, result.tokenIn, result.tokenOut);

  const artifactId = await withTenant(input.tenantId, async (tx) => {
    const [artifact] = await tx
      .insert(artifacts)
      .values({
        tenantId: input.tenantId,
        generationId,
        kind: 'text',
        content: result.text,
        mime: 'text/markdown',
        aiLabeled: true,
      })
      .returning({ id: artifacts.id });

    if (!artifact) {
      throw new Error('Failed to persist artifact.');
    }

    await tx
      .update(generations)
      .set({
        status: 'completed',
        tokenIn: result.tokenIn,
        tokenOut: result.tokenOut,
        costCents,
        artifactRef: artifact.id,
      })
      .where(eq(generations.id, generationId));

    await tx
      .update(usageCounters)
      .set({
        tokensUsed: sql`${usageCounters.tokensUsed} + ${result.tokenIn + result.tokenOut}`,
        updatedAt: now,
      })
      .where(and(eq(usageCounters.tenantId, input.tenantId), eq(usageCounters.period, period)));

    await tx.insert(auditLog).values({
      tenantId: input.tenantId,
      actorId: input.userId,
      action: 'generation.completed',
      target: generationId,
      meta: { type: 'text', artifactId: artifact.id, costCents },
    });

    return artifact.id;
  });

  return {
    generationId,
    artifactId,
    text: result.text,
    aiLabeled: true,
    model: result.model,
    tokenIn: result.tokenIn,
    tokenOut: result.tokenOut,
    costCents,
  };
}
