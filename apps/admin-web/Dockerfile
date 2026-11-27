# syntax=docker/dockerfile:1
#
# Production image for the admin-web Next.js app. Mirrors the general shape
# of services/backend/deploy/Dockerfile (multi-stage, non-root runtime user)
# adapted to Node/Next.js conventions: a dependencies stage, a build stage
# that produces Next.js's "standalone" output (next.config.js sets
# `output: "standalone"`), and a minimal runtime stage that only ships that
# standalone server plus static assets — not the full node_modules tree or
# source.
#
# NEXT_PUBLIC_API_BASE_URL is a build-time arg: Next.js inlines any
# NEXT_PUBLIC_* env var into the client-side JS bundle at `next build` time
# (admin-web's API calls run in the browser — see src/lib/apiClient.ts), so
# it must be supplied via --build-arg at image-build time, not as a
# docker-compose runtime environment variable (that would have no effect on
# the already-built client bundle).

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Next.js standalone output (.next/standalone) already contains a pruned
# node_modules with only the packages actually needed at runtime, plus a
# generated server.js entrypoint.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
