import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, withTenant } from '@/lib/db';
import { tenants, user, generations, artifacts, usageCounters, auditLog } from '@/lib/db/schema';
import { createTextGeneration } from '@/lib/ai/generate';
import { currentPeriod, PLAN_GENERATION_LIMITS, QuotaExceededError } from '@/lib/billing/limits';
import { MODELS } from '@/lib/ai/types';
import type { TextGenerator } from '@/lib/ai/text-generator';

/**
 * Integration tests for the generation orchestration against a real Postgres
 * (DATABASE_URL must point at a migrated DB with RLS + the app role). The
 * generator is faked, so no ANTHROPIC_API_KEY is needed — this exercises the
 * full persistence + RLS path without any external call.
 */

function fakeGenerator(text: string, tokenIn = 120, tokenOut = 80): TextGenerator {
  return {
    async generate() {
      return { text, model: MODELS.generator, tokenIn, tokenOut };
    },
  };
}

function failingGenerator(message: string): TextGenerator {
  return {
    async generate(): Promise<never> {
      throw new Error(message);
    },
  };
}

async function seedTenantUser(): Promise<{ tenantId: string; userId: string }> {
  const [tenant] = await db
    .insert(tenants)
    .values({ name: 'Integration Tenant' })
    .returning({ id: tenants.id });
  if (!tenant) throw new Error('seed tenant failed');

  const userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: 'Integration User',
    email: `int_${userId}@example.com`,
    tenantId: tenant.id,
  });

  return { tenantId: tenant.id, userId };
}

describe('createTextGeneration (integration)', () => {
  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    ({ tenantId, userId } = await seedTenantUser());
  });

  it('persists generation, artifact, usage and audit on success', async () => {
    const outcome = await createTextGeneration({
      tenantId,
      userId,
      plan: 'free',
      intent: 'Schreibe eine kurze Begrüßung',
      generator: fakeGenerator('Hallo und herzlich willkommen!'),
      now: new Date('2026-06-28T10:00:00Z'),
    });

    expect(outcome.text).toBe('Hallo und herzlich willkommen!');
    expect(outcome.aiLabeled).toBe(true);
    expect(outcome.costCents).toBeGreaterThan(0);

    await withTenant(tenantId, async (tx) => {
      const [gen] = await tx
        .select()
        .from(generations)
        .where(eq(generations.id, outcome.generationId));
      expect(gen?.status).toBe('completed');
      expect(gen?.tokenIn).toBe(120);
      expect(gen?.tokenOut).toBe(80);
      expect(gen?.artifactRef).toBe(outcome.artifactId);

      const [art] = await tx.select().from(artifacts).where(eq(artifacts.id, outcome.artifactId));
      expect(art?.content).toBe('Hallo und herzlich willkommen!');
      expect(art?.aiLabeled).toBe(true);
      expect(art?.mime).toBe('text/markdown');

      const [counter] = await tx
        .select()
        .from(usageCounters)
        .where(eq(usageCounters.tenantId, tenantId));
      expect(counter?.generationsCount).toBe(1);
      expect(counter?.tokensUsed).toBe(200);

      const audits = await tx.select().from(auditLog).where(eq(auditLog.tenantId, tenantId));
      expect(audits.some((a) => a.action === 'generation.completed')).toBe(true);
    });
  });

  it('enforces the plan quota before generating', async () => {
    const period = currentPeriod(new Date('2026-06-28T10:00:00Z'));
    // usage_counters is RLS-protected, so seed it within the tenant context.
    await withTenant(tenantId, async (tx) => {
      await tx.insert(usageCounters).values({
        tenantId,
        period,
        generationsCount: PLAN_GENERATION_LIMITS.free,
        tokensUsed: 0,
      });
    });

    await expect(
      createTextGeneration({
        tenantId,
        userId,
        plan: 'free',
        intent: 'Noch eine Generierung',
        generator: fakeGenerator('darf nicht passieren'),
        now: new Date('2026-06-28T10:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(QuotaExceededError);

    // No artifact may have been produced.
    await withTenant(tenantId, async (tx) => {
      const arts = await tx.select().from(artifacts).where(eq(artifacts.tenantId, tenantId));
      expect(arts).toHaveLength(0);
    });
  });

  it('marks the generation failed and audits it when the generator throws', async () => {
    await expect(
      createTextGeneration({
        tenantId,
        userId,
        plan: 'free',
        intent: 'Loese aus',
        generator: failingGenerator('boom'),
        now: new Date('2026-06-28T10:00:00Z'),
      }),
    ).rejects.toThrow('boom');

    await withTenant(tenantId, async (tx) => {
      const [gen] = await tx.select().from(generations).where(eq(generations.tenantId, tenantId));
      expect(gen?.status).toBe('failed');
      expect(gen?.error).toBe('boom');

      const audits = await tx.select().from(auditLog).where(eq(auditLog.tenantId, tenantId));
      expect(audits.some((a) => a.action === 'generation.failed')).toBe(true);
    });
  });
});
