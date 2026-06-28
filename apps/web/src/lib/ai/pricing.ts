import { MODELS, type ModelId } from '@/lib/ai/types';

/**
 * Anthropic token pricing in USD per million tokens (Sven · Billing).
 * Source: Claude API pricing — Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5 per MTok.
 * Kept here so cost metering is computed from one authoritative table.
 */
export const MODEL_PRICING: Record<ModelId, { inputPerMTok: number; outputPerMTok: number }> = {
  [MODELS.generator]: { inputPerMTok: 3, outputPerMTok: 15 },
  [MODELS.router]: { inputPerMTok: 1, outputPerMTok: 5 },
};

/**
 * Estimate the cost of a generation in whole cents (rounded up so we never
 * under-bill). Pure and deterministic.
 */
export function estimateCostCents(model: ModelId, tokenIn: number, tokenOut: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    throw new Error(`No pricing configured for model "${model}".`);
  }
  if (tokenIn < 0 || tokenOut < 0) {
    throw new Error('Token counts must be non-negative.');
  }
  const usd = (tokenIn * pricing.inputPerMTok + tokenOut * pricing.outputPerMTok) / 1_000_000;
  return Math.ceil(usd * 100);
}
