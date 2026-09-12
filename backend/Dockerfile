# syntax=docker/dockerfile:1
FROM node:24.21.0-alpine3.24@sha256:be80f76cf40ec8e42b9bec49f60a55e0660f30af58d3e5a25530785b30ea67e2 AS base
RUN apk add --no-cache openssl
WORKDIR /app/shared

FROM base AS shared-deps
COPY shared/package.json shared/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm PRISMA_SKIP_POSTINSTALL_GENERATE=1 npm ci --no-audit --no-fund

FROM shared-deps AS migrate
COPY shared/prisma ./prisma
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM shared-deps AS shared-build
COPY shared/prisma/schema.prisma ./prisma/schema.prisma
RUN npx --no-install prisma generate
COPY shared/tsconfig.json shared/*.ts ./
RUN npm run build && npm pkg set main=dist/index.js types=dist/index.d.ts

FROM shared-deps AS shared-production
# Prisma lists its CLI and TypeScript as optional peers of the runtime client.
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev --omit=optional --no-audit --no-fund

FROM shared-deps AS service-deps
ARG SERVICE
WORKDIR /app/${SERVICE}
COPY ${SERVICE}/package.json ${SERVICE}/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM service-deps AS build
COPY --from=shared-build /app/shared/package.json /app/shared/package.json
COPY --from=shared-build /app/shared/dist /app/shared/dist
COPY --from=shared-build /app/shared/node_modules/.prisma /app/shared/node_modules/.prisma
COPY ${SERVICE}/tsconfig.json ./
COPY ${SERVICE}/src ./src
RUN npm run build

FROM service-deps AS service-production
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev --no-audit --no-fund

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
ARG SERVICE
COPY --from=shared-production /app/shared/node_modules ./shared/node_modules
COPY --from=shared-build /app/shared/node_modules/.prisma ./shared/node_modules/.prisma
COPY --from=shared-build /app/shared/package.json ./shared/package.json
COPY --from=shared-build /app/shared/dist ./shared/dist
COPY --from=service-production /app/${SERVICE}/node_modules ./${SERVICE}/node_modules
COPY --from=build /app/${SERVICE}/package.json ./${SERVICE}/package.json
COPY --from=build /app/${SERVICE}/dist ./${SERVICE}/dist

FROM runtime AS web
EXPOSE 3001
CMD ["node", "web/dist/index.js"]

FROM runtime AS twitch
EXPOSE 4000
CMD ["node", "twitch/dist/index.js"]
