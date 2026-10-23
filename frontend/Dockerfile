# syntax=docker/dockerfile:1
FROM node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Build stage
FROM deps AS builder
COPY . .

# Disable telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
ARG TARGETARCH
RUN --mount=type=cache,id=vaarattu-next-${TARGETARCH},target=/app/.next/cache,sharing=locked npm run build

# Production stage
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3002

ENV PORT=3002

CMD ["node", "server.js"]
