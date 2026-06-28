import { z } from 'zod';

/**
 * Server-side environment configuration.
 *
 * Core variables (runtime mode, database, public URLs) are required and the
 * process must not boot without them. Provider credentials (Anthropic, fal.ai,
 * Stripe, auth secret) are validated as optional here so that database tooling
 * and tests can run without every third-party key — but they are required
 * *at the point of use* via {@link requireEnv}, which fails loudly with a clear
 * message instead of letting code silently fake a result (CLAUDE.md rule 2).
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Database — always required.
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .url('DATABASE_URL must be a valid postgres connection URL'),

  // Auth (better-auth) — required in production, optional locally/tests.
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),

  // AI providers — optional at parse time, required at use time.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  FAL_API_KEY: z.string().min(1).optional(),

  // Billing — optional at parse time, required at use time.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Public config — exposed to the browser.
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Keys that are validated as optional but mandatory at point of use. */
export type RequiredAtUseKey =
  | 'BETTER_AUTH_SECRET'
  | 'ANTHROPIC_API_KEY'
  | 'FAL_API_KEY'
  | 'STRIPE_SECRET_KEY'
  | 'STRIPE_WEBHOOK_SECRET';

/**
 * Parse and validate a raw environment record. Throws a readable error listing
 * every invalid/missing core variable. Pure function — easy to unit test.
 */
export function parseEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Load + validate the process environment once, then cache it. */
export function loadEnv(): ServerEnv {
  if (!cached) {
    cached = parseEnv(process.env);
  }
  return cached;
}

/**
 * Read a credential that is optional at parse time but required to perform a
 * real operation. Stops with an actionable error instead of faking a result.
 */
export function requireEnv(key: RequiredAtUseKey, env: ServerEnv = loadEnv()): string {
  const value = env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${key}". This operation cannot run ` +
        `without it. Set ${key} in your .env (see .env.example) — Volenti never ` +
        `fabricates results for missing credentials.`,
    );
  }
  return value;
}
