import { describe, it, expect } from 'vitest';
import {
  PLAN_GENERATION_LIMITS,
  currentPeriod,
  remainingQuota,
  isWithinQuota,
  QuotaExceededError,
} from '@/lib/billing/limits';

describe('currentPeriod', () => {
  it('formats the UTC year-month as YYYY-MM', () => {
    expect(currentPeriod(new Date('2026-06-28T12:00:00Z'))).toBe('2026-06');
    expect(currentPeriod(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
    expect(currentPeriod(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
  });
});

describe('quota helpers', () => {
  it('reports remaining quota for the free plan', () => {
    expect(remainingQuota('free', 0)).toBe(PLAN_GENERATION_LIMITS.free);
    expect(remainingQuota('free', 5)).toBe(PLAN_GENERATION_LIMITS.free - 5);
  });

  it('never returns a negative remaining quota', () => {
    expect(remainingQuota('free', PLAN_GENERATION_LIMITS.free + 10)).toBe(0);
  });

  it('allows generation strictly below the limit', () => {
    expect(isWithinQuota('free', PLAN_GENERATION_LIMITS.free - 1)).toBe(true);
    expect(isWithinQuota('free', PLAN_GENERATION_LIMITS.free)).toBe(false);
  });

  it('gives the pro plan a higher cap than free', () => {
    expect(PLAN_GENERATION_LIMITS.pro).toBeGreaterThan(PLAN_GENERATION_LIMITS.free);
  });
});

describe('QuotaExceededError', () => {
  it('carries plan/used/limit and a readable German message', () => {
    const err = new QuotaExceededError('free', PLAN_GENERATION_LIMITS.free);
    expect(err).toBeInstanceOf(Error);
    expect(err.plan).toBe('free');
    expect(err.limit).toBe(PLAN_GENERATION_LIMITS.free);
    expect(err.message).toMatch(/Kontingent/);
  });
});
