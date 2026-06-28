# Volenti

> Ein generativer Produktivitäts-Launcher. Du sagst, was du möchtest — Volenti liefert
> ein echtes, fertiges Artefakt (Text, Dokument oder Bild). Keine Platzhalter, keine Fakes.

Das oberste Gesetz dieses Repos ist [`CLAUDE.md`](./CLAUDE.md). Architektur- und
Provider-Entscheidungen stehen in [`DECISIONS.md`](./DECISIONS.md).

---

## Status

**Roadmap P0 — Skelett & erster echter End-to-End-Flow.**
Aktueller Stand: lauffähiges Projekt-Skelett (Monorepo, Next.js 15 + React 19, Tailwind,
Drizzle-Schema mit Row-Level Security, Zod-Env-Validierung, Vitest-Unit-Tests, Playwright-
Smoke-Test, Docker-Compose, CI-Pipeline). Die KI-Generierung (Anthropic Sonnet, Streaming)
ist der nächste Roadmap-Schritt und wird **nicht** gefälscht — die Oberfläche ist transparent
darüber, was sie heute tut.

## Tech-Stack (festgelegt — siehe CLAUDE.md §5)

TypeScript (strict) · Next.js 15 (App Router) + React 19 · Tailwind CSS + shadcn/ui · Zod ·
PostgreSQL 16 + Drizzle ORM (RLS) · better-auth · Anthropic API (Text) · fal.ai/FLUX (Bild) ·
pg-boss (Jobs) · Stripe (Billing) · Hetzner + Coolify + Docker · GitHub Actions · Playwright ·
Vitest · pnpm.

## Voraussetzungen

- Node.js ≥ 22, pnpm ≥ 10
- Docker (für lokales PostgreSQL)
- Linux/bash (Zielsystem des Entwicklers ist Linux/Pop!\_OS)

## Lokales Setup

```bash
# 1. Abhängigkeiten installieren
pnpm install

# 2. Umgebungsvariablen anlegen und ausfüllen
cp .env.example .env
#   -> mindestens DATABASE_URL setzen (passt zu docker-compose.yml)

# 3. PostgreSQL starten
docker compose up -d

# 4. Schema-Migration erzeugen und anwenden
pnpm db:generate
pnpm db:migrate
#   -> danach die RLS-Policies anwenden:
psql "$DATABASE_URL" -f apps/web/src/lib/db/rls-policies.sql

# 5. Dev-Server starten
pnpm dev
#   -> http://localhost:3000
```

## Wichtige Befehle

| Befehl | Wirkung |
|---|---|
| `pnpm dev` | Dev-Server (HMR) |
| `pnpm build` | Production-Build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript ohne Emit |
| `pnpm test` | Vitest-Unit-Tests |
| `pnpm test:e2e` | Playwright-E2E |
| `pnpm format` | Prettier schreiben |
| `pnpm db:generate` | Drizzle-Migration erzeugen |
| `pnpm db:migrate` | Migration anwenden |

## Projektstruktur

```
volenti/
├─ CLAUDE.md                 # oberstes Gesetz
├─ DECISIONS.md              # ADRs
├─ docker-compose.yml        # lokales PostgreSQL
├─ .env.example              # alle Variablen, ohne Werte
├─ .github/workflows/ci.yml  # Lint → Typecheck → Test → Build → E2E
└─ apps/web/                 # Next.js App (Frontend + API)
   ├─ src/app/               # App Router (Routes, API)
   ├─ src/components/        # UI
   ├─ src/lib/ai/            # Intent-Router, Modelle
   ├─ src/lib/db/            # Drizzle-Schema, Migrationen, RLS
   ├─ src/lib/validation/    # Zod-Schemas (Env, Intent)
   └─ src/tests/             # Vitest (unit) + Playwright (e2e)
```

## Sicherheit & Compliance

- **Tenant-Isolation:** Row-Level Security in PostgreSQL (`app.tenant_id`) + App-Guard.
- **DSGVO/EU-AI-Act:** Datensparsamkeit, Audit-Log, Löschpfad, KI-Kennzeichnung — Fundament,
  kein Feature (CLAUDE.md §8).
- **Keine Secrets im Repo.** Alles über `.env` (lokal) bzw. Coolify-Secrets (prod).
