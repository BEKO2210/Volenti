/**
 * Pure, dependency-free auth/tenant helpers. Kept separate from auth.ts so they
 * can be unit-tested without importing the full better-auth runtime.
 */

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

/** Minimal shape of an authenticated user as returned by better-auth. */
export interface SessionUserLike {
  id: string;
  email: string;
  tenantId?: string | null;
  role?: string | null;
}

/**
 * Derive a friendly default workspace name from a user's name/email.
 * Each new account gets its own single-user tenant in v1.
 */
export function defaultTenantName(input: { name?: string | null; email: string }): string {
  const trimmed = input.name?.trim();
  if (trimmed) return `${trimmed}s Arbeitsbereich`;
  const local = input.email.split('@')[0]?.trim();
  return `${local && local.length > 0 ? local : 'mein'}s Arbeitsbereich`;
}

/**
 * Resolve a tenant context from a session user, or null if the user is not
 * bound to a tenant. The guard turns null into a redirect; tests use this
 * pure function directly.
 */
export function resolveTenantContext(
  sessionUser: SessionUserLike | null | undefined,
): TenantContext | null {
  if (!sessionUser?.id || !sessionUser.tenantId) {
    return null;
  }
  return {
    userId: sessionUser.id,
    tenantId: sessionUser.tenantId,
    role: sessionUser.role ?? 'owner',
    email: sessionUser.email,
  };
}
