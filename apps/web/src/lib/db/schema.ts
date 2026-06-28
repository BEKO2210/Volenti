import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';

/**
 * Volenti v1 schema.
 *
 * Auth tables (`user`, `session`, `account`, `verification`) follow the
 * better-auth core schema and are managed exclusively by better-auth. The
 * `user` row additionally carries `tenantId` + `role` (set during sign-up
 * provisioning, never by user input).
 *
 * Domain tables (`generations`, `artifacts`, `usage_counters`, `audit_log`)
 * carry `tenantId` and are isolated at the database level via Row-Level
 * Security (see migrations + rls-policies.sql) plus the requireTenant() guard.
 * Auth tables are intentionally NOT under RLS — the sign-in lookup runs before
 * any tenant context exists (see DECISIONS.md ADR-002).
 */

// --- Enums -------------------------------------------------------------------

export const planEnum = pgEnum('plan', ['free', 'pro']);
export const userRoleEnum = pgEnum('user_role', ['owner', 'member']);
export const generationTypeEnum = pgEnum('generation_type', [
  'text',
  'image',
  'document',
  'unsupported',
]);
export const generationStatusEnum = pgEnum('generation_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);
export const artifactKindEnum = pgEnum('artifact_kind', ['text', 'image', 'document']);

// --- Tenants -----------------------------------------------------------------

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: planEnum('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Auth: user (better-auth core + tenant membership) -----------------------

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    // Tenant membership — populated by the sign-up provisioning hook.
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull().default('owner'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('user_tenant_idx').on(table.tenantId)],
);

// --- Auth: session -----------------------------------------------------------

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Auth: account (credentials / OAuth links) -------------------------------

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  // Hashed password for email/password accounts (better-auth manages hashing).
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Auth: verification ------------------------------------------------------

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Generations -------------------------------------------------------------

export const generations = pgTable(
  'generations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: generationTypeEnum('type').notNull(),
    intentText: text('intent_text').notNull(),
    status: generationStatusEnum('status').notNull().default('pending'),
    model: text('model'),
    tokenIn: integer('token_in').notNull().default(0),
    tokenOut: integer('token_out').notNull().default(0),
    costCents: integer('cost_cents').notNull().default(0),
    artifactRef: uuid('artifact_ref'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('generations_tenant_idx').on(table.tenantId),
    index('generations_tenant_created_idx').on(table.tenantId, table.createdAt),
  ],
);

// --- Artifacts ---------------------------------------------------------------

export const artifacts = pgTable(
  'artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    kind: artifactKindEnum('kind').notNull(),
    storagePath: text('storage_path'),
    content: text('content'),
    mime: text('mime').notNull(),
    aiLabeled: boolean('ai_labeled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('artifacts_tenant_idx').on(table.tenantId)],
);

// --- Usage counters ----------------------------------------------------------

export const usageCounters = pgTable(
  'usage_counters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    generationsCount: integer('generations_count').notNull().default(0),
    tokensUsed: bigint('tokens_used', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('usage_counters_tenant_period_unique').on(table.tenantId, table.period)],
);

// --- Audit log ---------------------------------------------------------------

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    target: text('target'),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_log_tenant_idx').on(table.tenantId)],
);

// --- Inferred types ----------------------------------------------------------

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;
export type UsageCounter = typeof usageCounters.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
