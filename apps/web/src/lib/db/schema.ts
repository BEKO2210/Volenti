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
 * Volenti v1 minimum schema (CLAUDE.md §6.4).
 *
 * Multi-tenancy: every tenant-scoped row carries `tenantId`. Isolation is
 * enforced at the database level via Row-Level Security policies (see
 * migrations/0001_rls_policies.sql) AND in application code via a central
 * requireTenant() guard — never one without the other.
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

// --- Users -------------------------------------------------------------------
// Identity/credentials are managed by better-auth; this table holds the
// app-level tenant membership and role. `email` is unique per tenant.

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name'),
    role: userRoleEnum('role').notNull().default('owner'),
    emailVerified: boolean('email_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('users_tenant_email_unique').on(table.tenantId, table.email),
    index('users_tenant_idx').on(table.tenantId),
  ],
);

// --- Generations -------------------------------------------------------------
// One row per intent the user submitted, with cost/usage metering fields.

export const generations = pgTable(
  'generations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
// The actual produced output, always AI-labeled (EU AI Act transparency).

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
// Per-tenant, per-period rollup for plan limits & billing (Sven · Billing).

export const usageCounters = pgTable(
  'usage_counters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // Billing period bucket, e.g. "2026-06" (YYYY-MM, UTC).
    period: text('period').notNull(),
    generationsCount: integer('generations_count').notNull().default(0),
    tokensUsed: bigint('tokens_used', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('usage_counters_tenant_period_unique').on(table.tenantId, table.period)],
);

// --- Audit log ---------------------------------------------------------------
// Security/privacy-relevant actions (DSGVO). Append-only by convention.

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
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
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;
export type UsageCounter = typeof usageCounters.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
