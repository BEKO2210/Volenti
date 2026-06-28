-- =============================================================================
-- Volenti — Row-Level Security policies
-- -----------------------------------------------------------------------------
-- Tenant isolation enforced by PostgreSQL itself on the domain tables that hold
-- tenant data and AI outputs. Each such table only exposes rows whose
-- `tenant_id` matches the session setting `app.tenant_id`, which the application
-- sets per-transaction via `set_config('app.tenant_id', <id>, true)`
-- (see db/index.ts -> withTenant).
--
-- Scope (ADR-002): RLS is applied to generations, artifacts, usage_counters and
-- audit_log. It is intentionally NOT applied to the better-auth tables
-- (user, session, account, verification) or to `tenants`, because:
--   * the sign-in lookup queries `user`/`session` BEFORE any tenant context
--     exists, so RLS there would break authentication;
--   * tenant provisioning on sign-up inserts a `tenants` row before a context
--     exists. These tables are guarded at the application layer (a user only
--     ever resolves their own session -> their own tenantId).
--
-- Apply AFTER the generated table migration:
--   psql "$DATABASE_URL" -f src/lib/db/rls-policies.sql
--
-- Idempotent: safe to re-run.
--
-- CRITICAL (Frederike · Security): PostgreSQL superusers and the table OWNER
-- BYPASS row-level security. `FORCE ROW LEVEL SECURITY` (below) subjects the
-- owner to RLS, but superusers always bypass it. Therefore the application MUST
-- connect as a dedicated NOSUPERUSER NOBYPASSRLS role — never as the admin/owner
-- role used for migrations. Create it once (password from your secrets store):
--
--   CREATE ROLE volenti_app LOGIN PASSWORD '<from-secrets>' NOSUPERUSER NOBYPASSRLS;
--   GRANT USAGE ON SCHEMA public TO volenti_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO volenti_app;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO volenti_app;
--
-- Point DATABASE_URL (the app runtime) at volenti_app; keep the owner role for
-- migrations only.
-- =============================================================================

-- Helper: current tenant id from the session, or NULL when unset.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'generations',
    'artifacts',
    'usage_counters',
    'audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant())',
      t
    );
  END LOOP;
END $$;
