-- =============================================================================
-- Volenti — Row-Level Security policies
-- -----------------------------------------------------------------------------
-- Tenant isolation enforced by PostgreSQL itself. Every tenant-scoped table
-- only exposes rows whose `tenant_id` matches the session setting
-- `app.tenant_id`, which the application sets per-transaction via
-- `set_config('app.tenant_id', <id>, true)` (see db/index.ts -> withTenant).
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
-- migrations only. Verified: with this role, set_config('app.tenant_id', ...)
-- restricts every query to a single tenant and blocks cross-tenant writes.
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
    'tenants',
    'users',
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
  END LOOP;
END $$;

-- `tenants` is keyed on its own `id`; all other tables on `tenant_id`.
CREATE POLICY tenant_isolation ON tenants
  USING (id = app_current_tenant())
  WITH CHECK (id = app_current_tenant());

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

CREATE POLICY tenant_isolation ON generations
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

CREATE POLICY tenant_isolation ON artifacts
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

CREATE POLICY tenant_isolation ON usage_counters
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());
