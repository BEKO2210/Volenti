import { describe, it, expect } from 'vitest';
import { estimateCostCents, MODEL_PRICING } from '@/lib/ai/pricing';
import { MODELS } from '@/lib/ai/types';

describe('estimateCostCents', () => {
  it('prices Sonnet generation at $3/$15 per MTok, rounded up to cents', () => {
    // 1,000,000 in + 1,000,000 out = $3 + $15 = $18 = 1800 cents.
    expect(estimateCostCents(MODELS.generator, 1_000_000, 1_000_000)).toBe(1800);
  });

  it('rounds tiny usage up to at least 1 cent (never under-bill)', () => {
    expect(estimateCostCents(MODELS.generator, 10, 10)).toBe(1);
  });

  it('returns 0 cents for zero usage', () => {
    expect(estimateCostCents(MODELS.generator, 0, 0)).toBe(0);
  });

  it('prices the Haiku router at $1/$5 per MTok', () => {
    expect(estimateCostCents(MODELS.router, 1_000_000, 1_000_000)).toBe(600);
  });

  it('rejects negative token counts', () => {
    expect(() => estimateCostCents(MODELS.generator, -1, 0)).toThrow();
  });

  it('has pricing configured for every model', () => {
    expect(MODEL_PRICING[MODELS.generator]).toBeDefined();
    expect(MODEL_PRICING[MODELS.router]).toBeDefined();
  });
});
