# syntax=docker/dockerfile:1
#
# Production image for the marketing-site Next.js app. Same shape as
# apps/admin-web/Dockerfile (see that file's header comment for the full
# rationale) — multi-stage build producing Next.js's "standalone" output,
# non-root runtime user, no source/node_modules shipped at runtime.
#
# Unlike admin-web, marketing-site makes no backend API calls (it's static
# marketing/legal content), so it needs no NEXT_PUBLIC_API_BASE_URL build
# arg.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
