# DECISIONS.md — Architecture Decision Records

> Append-only log of architecture and provider decisions (ADR format). Newest on top.
> Format: **ADR-NNN · Title** — Status · Context · Decision · Consequences.

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
