# DECISIONS.md — Architecture Decision Records

> Append-only log of architecture and provider decisions (ADR format). Newest on top.
> Format: **ADR-NNN · Title** — Status · Context · Decision · Consequences.

---

## ADR-003 · Text-Generierungs-Fundament (P0.4a, key-frei)

- **Status:** Accepted — 2026-06-28
- **Rollen:** Dr. Amir (AI), Tom (Backend), Sven (Billing), Frederike (Compliance)
- **Kontext:** Roadmap P0 Schritt 4 (erster echter Generierungs-Typ: Text). Es liegt
  noch kein `ANTHROPIC_API_KEY` vor. CLAUDE.md-Regel 2 verbietet Fake-Antworten.
- **Entscheidung:**
  - Den vollständigen, realen Generierungs-Pfad bauen, aber den Live-Call hinter
    einem `requireEnv('ANTHROPIC_API_KEY')`-Guard kapseln: ohne Key stoppt der Code
    ehrlich (UI: „KI noch nicht konfiguriert"), statt zu faken.
  - `TextGenerator`-Interface entkoppelt die Orchestrierung vom SDK; der Anthropic-
    Adapter nutzt `messages.stream` + `finalMessage()` (Streaming intern gegen
    HTTP-Timeouts), Modell `claude-sonnet-4-6`.
  - Orchestrierung (`createTextGeneration`): Quota-Check → Reservierung +
    `generations`(running) → Generator → `artifacts` + Usage + Audit (completed)
    bzw. failed. Alle tenant-bezogenen Writes via `withTenant`/RLS. Generator wird
    injiziert → voll testbar ohne Key.
  - **Usage-Metering & harte Quote** (Sven): pro Tenant/Periode (YYYY-MM); Free=20,
    Pro=1000 Generierungen/Monat. Slot wird vor dem Call reserviert (auch
    Fehlversuche zählen) → kein unbegrenztes Generieren (CLAUDE.md §11).
    Kosten über Pricing-Tabelle (Sonnet $3/$15, Haiku $1/$5 pro MTok).
  - **KI-Kennzeichnung** (Frederike): Artefakte tragen `aiLabeled=true`, im UI als
    „KI-generiert" gekennzeichnet (EU-AI-Act).
  - v1/P0.4 unterstützt nur **Text**; Bild/Dokument-Intents werden ehrlich abgelehnt.
- **Konsequenzen:**
  - Verifiziert: Orchestrierung gegen echtes Postgres (Erfolg, Quota-Block,
    Fehlerpfad) als `volenti_app`-Rolle; E2E prüft den ehrlichen No-Key-Pfad.
  - **Nicht** getestet ohne Key: der echte Anthropic-Call selbst (Adapter ist
    geradlinige SDK-Nutzung, an der `claude-api`-Referenz ausgerichtet). Sobald der
    Key vorliegt: ein E2E-Smoke-Test gegen eine reale Generierung ergänzen.
  - Token-genaues Live-Streaming in die UI ist Folgeausbau; aktuell wird das
    fertige Artefakt angezeigt (intern wird gestreamt).

---

## ADR-002 · Authentifizierung (better-auth) & Tenant-Provisioning

- **Status:** Accepted — 2026-06-28
- **Rollen:** Mara (CTO), Tom (Backend), Frederike (Security/DSGVO)
- **Kontext:** Roadmap P0 Schritt 2/3 verlangt Registrierung/Login, Sessions,
  geschützte Routen und die Multi-Tenant-Verknüpfung mit einem zentralen Guard.
- **Entscheidung:**
  - `better-auth` (self-hosted, E-Mail/Passwort) gegen die bestehende Postgres,
    Drizzle-Adapter. Schema folgt dem better-auth-Kernschema
    (`user`/`session`/`account`/`verification`); `user` trägt zusätzlich
    `tenantId` + `role`.
  - **Tenant-Provisioning** läuft im `user.create.before`-Hook: pro neuem Konto
    wird atomar ein eigener Tenant angelegt und dessen Id injiziert — es gibt nie
    einen tenant-losen User. Der `after`-Hook schreibt einen `user.signup`-Eintrag
    in den tenant-isolierten `audit_log` (DSGVO).
  - `tenantId` ist als `additionalField` mit `input: false, required: false`
    deklariert: better-auth validiert Pflicht-Felder VOR dem Hook, daher darf das
    Feld nicht als „required" gelten; die DB-Spalte bleibt dennoch `NOT NULL` und
    wird vom Hook gefüllt.
  - **`requireTenant()`-Guard** löst die Session zu `{userId, tenantId, role,
    email}` auf oder leitet auf `/login` um. Reine Logik (`resolveTenantContext`,
    `defaultTenantName`) ist von der better-auth-Laufzeit getrennt und unit-getestet.
  - **RLS-Scope (Sicherheitsabwägung):** RLS gilt für die Domain-Tabellen
    (`generations`, `artifacts`, `usage_counters`, `audit_log`). Die better-auth-
    Tabellen und `tenants` sind bewusst NICHT unter RLS, weil der Sign-in-Lookup
    und das Sign-up-Provisioning ablaufen, BEVOR ein Tenant-Kontext existiert.
    Isolation dieser Tabellen erfolgt auf App-Ebene (ein User löst stets nur seine
    eigene Session → seinen eigenen Tenant auf). Die schützenswerten Daten
    (Generierungen/Artefakte) bleiben DB-erzwungen isoliert.
  - **Pre-Launch-Migration squash:** Da noch keine Produktiv-DB existiert, wurde
    die einzelne Migration zu einer kohärenten `0000`-Migration mit dem neuen
    Schema zusammengefasst.
- **Konsequenzen:**
  - Verifiziert gegen echtes Postgres als Nicht-Superuser-Rolle `volenti_app`:
    Sign-up legt Tenant+User+Audit-Eintrag an; RLS isoliert `generations`
    (eigener Kontext sichtbar, fremder Kontext 0 Zeilen, Cross-Tenant-Insert
    blockiert).
  - E-Mail-Verifikation ist bis zur Anbindung eines Mail-Providers deaktiviert
    (keine Fake-Mails). `BETTER_AUTH_SECRET` ist ab jetzt für Build/Run nötig.
  - Künftige Härtung (optional): SECURITY-DEFINER-Provisioning + RLS auch auf
    `tenants`.

---

## ADR-001 · Projekt-Skelett für P0 (Monorepo, Stack-Bootstrap)

- **Status:** Accepted — 2026-06-28
- **Rollen:** Viktor (CEO), Mara (CTO), Tom (Backend), Carlos (DevOps)
- **Kontext:** Das Repository enthielt nur `CLAUDE.md`. Roadmap P0 Schritt 1 verlangt ein
  lauffähiges Fundament (Next.js + Tailwind + Drizzle + Postgres + CI), bevor der erste
  echte Generierungs-Flow gebaut werden kann.
- **Entscheidung:**
  - pnpm-Workspace-Monorepo mit `apps/web` als einziger App (Raum für spätere Pakete).
  - Exakt gepinnte Versionen gemäß CLAUDE.md §5; Lockfile committed.
  - TypeScript `strict` plus `noUncheckedIndexedAccess`/`noImplicitOverride`.
  - Vollständiges v1-Datenmodell (CLAUDE.md §6.4) als Drizzle-Schema.
  - Tenant-Isolation über PostgreSQL Row-Level Security (`app.tenant_id`) **und**
    App-Guard (`withTenant`) — nie nur eine Ebene.
  - Env-Konfiguration via Zod, fail-fast; Provider-Keys sind optional beim Parsen, aber
    über `requireEnv` am Verwendungsort verpflichtend (kein Fake bei fehlendem Key).
  - CI: Lint → Typecheck → Unit (Vitest) → Build → E2E (Playwright).
- **Konsequenzen:**
  - Kein Generierungs-Flow in diesem Schritt; die UI ist transparent darüber. Der
    heuristische Intent-Vorklassifikator ist echte, getestete Logik — kein Ersatz für den
    späteren Haiku-Router (Roadmap P1 Schritt 7).
  - RLS-Policies liegen als separate, idempotente SQL-Datei vor und werden nach der
    generierten Tabellen-Migration angewendet.

---

## Compliance-Register (AVV/DPA pro Provider)

> Pflicht laut CLAUDE.md §8. Status wird gepflegt, sobald ein Provider real angebunden wird.

| Provider | Zweck | EU-Verarbeitung | AVV/DPA | Status |
|---|---|---|---|---|
| Hetzner | Hosting (DE) | Ja (DE) | vorhanden | geplant (P0.5 Deploy) |
| Anthropic | Textgenerierung | tlw. außerhalb EU | DPA verfügbar | offen — vor P0.4 zu dokumentieren |
| fal.ai | Bildgenerierung | außerhalb EU möglich | DPA verfügbar | offen — vor P1 Bild zu dokumentieren |
| Stripe | Billing | tlw. außerhalb EU | DPA verfügbar | offen — vor P1 Billing zu dokumentieren |

---

## Pricing-Register

> Wird befüllt, sobald Echtkosten (Token/Bild) gemessen sind (CLAUDE.md §11). Aktuell leer.
