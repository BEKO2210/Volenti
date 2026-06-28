# =============================================================================
# Volenti web — production image (multi-stage). Deployed via Coolify on Hetzner.
# Builds the Next.js standalone server. No secrets are baked in; runtime config
# comes from Coolify-managed environment variables.
# =============================================================================

# --- Base ---------------------------------------------------------------------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# --- Dependencies -------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
# A throwaway lockfile copy keeps the layer cache valid even before it exists.
COPY pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# --- Build --------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
# DATABASE_URL is only needed to satisfy env validation during build.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @volenti/web build

# --- Runtime ------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
