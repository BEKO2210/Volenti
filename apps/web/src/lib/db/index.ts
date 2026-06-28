import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { loadEnv } from '@/lib/validation/env';
import * as schema from '@/lib/db/schema';

/**
 * Single shared postgres connection pool + Drizzle client.
 *
 * Row-Level Security policies key off the session setting `app.tenant_id`
 * (see migrations/0001_rls_policies.sql). Tenant-scoped queries must run
 * inside {@link withTenant}, which sets that variable transactionally so the
 * database itself enforces isolation — the app guard is a second layer, never
 * the only one.
 */

const env = loadEnv();

// Reuse the client across hot reloads in development to avoid exhausting
// connections (Next.js re-evaluates modules on change).
const globalForDb = globalThis as unknown as {
  __volentiSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb.__volentiSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
  });

if (env.NODE_ENV !== 'production') {
  globalForDb.__volentiSql = sql;
}

export const db = drizzle(sql, { schema });
export type Database = typeof db;

/**
 * Run a callback with the RLS tenant context bound for the duration of a single
 * transaction. `set_config(..., true)` scopes the setting to the transaction,
 * so it cannot leak across pooled connections.
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sqlSetTenant(tenantId));
    return callback(tx);
  });
}

// Build the parameterised SET statement. Kept as a helper for testability.
import { sql as drizzleSql } from 'drizzle-orm';
function sqlSetTenant(tenantId: string) {
  return drizzleSql`select set_config('app.tenant_id', ${tenantId}, true)`;
}

export { schema };
