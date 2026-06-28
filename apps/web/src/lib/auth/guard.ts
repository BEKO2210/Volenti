import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { resolveTenantContext, type SessionUserLike, type TenantContext } from '@/lib/auth/tenant';

/** Read the current better-auth session for the incoming request (or null). */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Central server guard. Resolves the authenticated user's tenant context or
 * redirects unauthenticated visitors to /login. Every tenant-scoped data access
 * must go through the returned tenantId (via withTenant), never a raw query.
 */
export async function requireTenant(): Promise<TenantContext> {
  const result = await getSession();
  const context = resolveTenantContext(result?.user as SessionUserLike | undefined);
  if (!context) {
    redirect('/login');
  }
  return context;
}

export type { TenantContext };
