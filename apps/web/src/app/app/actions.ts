'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { requireTenant } from '@/lib/auth/guard';
import { intentInputSchema } from '@/lib/validation/intent';
import { classifyIntentHeuristic } from '@/lib/ai/intent-router';
import { createAnthropicTextGenerator } from '@/lib/ai/text-generator';
import { createTextGeneration } from '@/lib/ai/generate';
import { QuotaExceededError, type Plan } from '@/lib/billing/limits';

export type GenerateActionResult =
  | { ok: true; text: string; model: string }
  | {
      ok: false;
      code: 'invalid' | 'unsupported' | 'not_configured' | 'quota' | 'error';
      message: string;
    };

/**
 * Server action: turn an intent into a real text artifact, scoped to the
 * authenticated tenant. Honest about its limits — unsupported intents are
 * refused, and a missing ANTHROPIC_API_KEY yields a clear "not configured"
 * message instead of a fabricated result (CLAUDE.md rule 2).
 */
export async function generateTextAction(formData: FormData): Promise<GenerateActionResult> {
  const parsed = intentInputSchema.safeParse({ intent: formData.get('intent') });
  if (!parsed.success) {
    return {
      ok: false,
      code: 'invalid',
      message: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.',
    };
  }
  const intent = parsed.data.intent;

  const ctx = await requireTenant();

  // v1/P0.4 supports the text type only — be honest about the rest.
  const classification = classifyIntentHeuristic(intent);
  if (classification.type !== 'text') {
    return {
      ok: false,
      code: 'unsupported',
      message:
        classification.type === 'unsupported'
          ? 'Diesen Intent kann Volenti (noch) nicht erfüllen.'
          : 'Aktuell wird nur die Textgenerierung unterstützt — Bild und Dokument folgen.',
    };
  }

  let generator;
  try {
    generator = createAnthropicTextGenerator();
  } catch {
    return {
      ok: false,
      code: 'not_configured',
      message:
        'Die KI-Textgenerierung ist noch nicht konfiguriert (ANTHROPIC_API_KEY fehlt). ' +
        'Es werden keine Platzhalter-Ergebnisse erzeugt.',
    };
  }

  const [tenant] = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId));
  const plan: Plan = tenant?.plan ?? 'free';

  try {
    const outcome = await createTextGeneration({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      plan,
      intent,
      generator,
    });
    return { ok: true, text: outcome.text, model: outcome.model };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { ok: false, code: 'quota', message: error.message };
    }
    return {
      ok: false,
      code: 'error',
      message: 'Die Generierung ist fehlgeschlagen. Bitte versuche es später erneut.',
    };
  }
}
