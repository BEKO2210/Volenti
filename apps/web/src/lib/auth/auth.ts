import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, withTenant } from '@/lib/db';
import { tenants, user, session, account, verification, auditLog } from '@/lib/db/schema';
import { loadEnv, requireEnv } from '@/lib/validation/env';
import { defaultTenantName } from '@/lib/auth/tenant';

const env = loadEnv();

/**
 * better-auth instance (self-hosted, email/password). Tenant provisioning runs
 * inside the user-create lifecycle so that every user is bound to exactly one
 * tenant atomically — there is never a tenant-less user.
 */
export const auth = betterAuth({
  appName: 'Volenti',
  secret: requireEnv('BETTER_AUTH_SECRET', env),
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Email verification flow is added with the email provider in a later step;
    // until then accounts are usable immediately (honest: no fake mail sending).
    requireEmailVerification: false,
    minPasswordLength: 10,
  },
  user: {
    additionalFields: {
      // Set by the provisioning hook below — never accepted from client input.
      // `required: false` so input validation does not demand it before the
      // before-create hook injects it; the DB column itself stays NOT NULL.
      tenantId: { type: 'string', input: false, required: false },
      role: { type: 'string', input: false, required: false, defaultValue: 'owner' },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Provision a tenant BEFORE the user row is written and inject its id,
        // so the NOT NULL tenant_id foreign key is always satisfied.
        before: async (newUser) => {
          const [tenant] = await db
            .insert(tenants)
            .values({ name: defaultTenantName(newUser) })
            .returning({ id: tenants.id });

          if (!tenant) {
            throw new Error('Tenant provisioning failed during sign-up.');
          }

          return {
            data: { ...newUser, tenantId: tenant.id, role: 'owner' as const },
          };
        },
        // Record the sign-up in the tenant-scoped audit log (DSGVO).
        after: async (createdUser) => {
          const tenantId = (createdUser as { tenantId?: string }).tenantId;
          if (!tenantId) return;
          await withTenant(tenantId, async (tx) => {
            await tx.insert(auditLog).values({
              tenantId,
              actorId: createdUser.id,
              action: 'user.signup',
              target: createdUser.id,
              meta: { email: createdUser.email },
            });
          });
        },
      },
    },
  },
});

export type Auth = typeof auth;
