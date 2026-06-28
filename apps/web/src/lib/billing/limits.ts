/**
 * Plan limits & quota enforcement (Sven · Billing).
 *
 * Every generation is metered and capped per tenant per billing period — a
 * tenant can NEVER generate without limit (CLAUDE.md §11). The hard check runs
 * before any paid AI call.
 */

export type Plan = 'free' | 'pro';

/** Maximum number of generations a plan allows per billing period (month). */
export const PLAN_GENERATION_LIMITS: Record<Plan, number> = {
  free: 20,
  pro: 1000,
};

/** Current billing period bucket in UTC, formatted as YYYY-MM. */
export function currentPeriod(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Remaining generations for a plan given how many were already used. */
export function remainingQuota(plan: Plan, used: number): number {
  const limit = PLAN_GENERATION_LIMITS[plan];
  return Math.max(0, limit - used);
}

/** Whether another generation is allowed under the plan's quota. */
export function isWithinQuota(plan: Plan, used: number): boolean {
  return used < PLAN_GENERATION_LIMITS[plan];
}

/** Error thrown when a tenant has exhausted its plan quota. */
export class QuotaExceededError extends Error {
  readonly plan: Plan;
  readonly used: number;
  readonly limit: number;

  constructor(plan: Plan, used: number) {
    const limit = PLAN_GENERATION_LIMITS[plan];
    super(
      `Generierungs-Kontingent für den Plan "${plan}" ist aufgebraucht ` +
        `(${used}/${limit} in diesem Monat). Bitte upgrade oder warte auf den nächsten Zeitraum.`,
    );
    this.name = 'QuotaExceededError';
    this.plan = plan;
    this.used = used;
    this.limit = limit;
  }
}
