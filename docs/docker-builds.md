# Docker builds

Run commands from the repository root with Docker Compose v2 and BuildKit. To build without starting the application or running migrations:

```bash
docker compose --progress plain build
```

On a memory- or storage-constrained Raspberry Pi, try limiting simultaneous service builds:

```bash
docker compose --parallel 1 --progress plain build
```

For an explicit one-service-at-a-time build, run `docker compose build db-migrate`, then `docker compose build backend-web`, `docker compose build backend-twitch`, and `docker compose build frontend`. Stop if any command fails. Once all images build successfully, deployment is a separate step:

```bash
docker compose up -d --no-build
```

Deployment still runs database migrations before either backend starts. Building images does not connect to the database. Keep the existing `backend/.env` and Twitch token files on the host; Compose supplies them at runtime. Host networking is unchanged; published port mappings were redundant with it.

## What is cached

- `backend/Dockerfile` builds both services and the migration image. Compose selects the `web`, `twitch`, or `migrate` target and supplies the matching `SERVICE` build argument for each backend.
- Shared dependencies, Prisma generation, and shared TypeScript compilation use common stages. Editing shared TypeScript does not reinstall dependencies or regenerate Prisma; changing a migration alone only rebuilds the migration image.
- Each service installs from its lockfile before copying source. Its production dependency stage is independent of source changes. Runtime images contain compiled JavaScript, production dependencies, and the generated Prisma client. The migration image retains Prisma tooling but does not compile either service.
- npm downloads persist in a BuildKit cache mount. The frontend inherits its installed dependencies instead of copying the whole `node_modules` tree into another stage. Next.js compilation cache persists separately for each CPU architecture.
- Build contexts exclude local dependencies, generated output, logs, and TypeScript caches. Backend contexts also exclude environment files and tokens. The frontend still reads its existing `.env` / `.env.local` build configuration for `NEXT_PUBLIC_API_BASE_URL`; these files must contain only public frontend configuration, never backend secrets. Changing that public URL requires rebuilding the frontend.

Keep using the same Docker builder on the host. Routine `--no-cache` builds or builder-cache pruning discard the reuse that makes subsequent builds fast. Dependency or pinned base-image updates necessarily rebuild affected layers once. The frontend's existing `next/font/google` integration also needs network access on a cold build.

## When simple steps take minutes

The supplied deployment log showed tiny contexts but a roughly 45-second `WORKDIR`, 173-second `sed`, and seven-minute dependency installs. Those timings suggest host resource contention beyond application compilation; they do not identify the precise cause. During a slow build, check:

```bash
free -h
vmstat 1
df -h
df -i
docker system df
```

Sustained swap activity (`si`/`so` in `vmstat`), high I/O wait (`wa`), or a full Docker filesystem can explain slow layer creation. On a Pi, `vcgencmd get_throttled` can also reveal throttling if the utility is available. Check the storage underlying Docker, especially when using an SD card or a VM disk. These are diagnostic checks; do not delete volumes or prune the build cache as a routine speed fix.

## Dependency maintenance

### Dependency update, 2026-11-18

Both application images use Node 26.13.1 LTS on Alpine 3.24. All four npm workspaces use TypeScript 6.0.3. The frontend uses Next.js 16.4.6 and React 19.3.1. ESLint 9 and TypeScript 6 match the supported peer ranges of the Next.js lint plugins.

The API and collector use Prisma 7.10.1 with the PostgreSQL adapter. The shared client reads the existing `DATABASE_URL` on connection and passes `connection_limit` to the driver pool. The migration service uses the existing migration history via `prisma.config.ts`. This release requires no database schema or PostgreSQL server upgrade. The disposable integration database follows the production PostgreSQL 17 major.

Production uses the Compose checkout at `raspbi5:/home/koodattu/vaarattu.tv` and serves `https://dev.vaarattu.tv`. Preserve the previous image IDs before the sequential build, then run `docker compose up -d --no-build`. Verify the migration exit code, running package versions and a public read such as `/api/clips?limit=1`. The GitHub workflow is a placeholder.

### Security update: 2026-10-23

Both Dockerfiles now pin Node 24.22.1 / Alpine 3.24 at the verified multi-architecture digest, including ARM64. This takes the October 21 Node security release without changing the Node major or Alpine release line. Next.js and its ESLint config move together to 16.4.2. The lockfiles also update Sharp to 0.35.5, source-map-js to 1.2.2, proxy-addr to 2.0.8, follow-redirects to 1.16.1, and compatible brace-expansion fixes.

Remaining audit findings are in development/build tooling: the braces dependency chains used by Next's ESLint config and backend nodemon, and the previously documented Prisma CLI/deepmerge-ts chain. Do not apply npm's suggested major downgrades or force an unverified Prisma migration. Production backend images continue to prune development tooling; the migration image retains Prisma tooling.

Local validation passed frontend lint, type checking and production build, shared and backend TypeScript builds, all 46 Twitch tests, and 20 web tests. Seven database integration tests were skipped because local Docker was unavailable; browser/database journeys were not run. Build all four ARM64 Compose images before rollout, then verify the running Node/package versions, API/frontend responses, and collector startup. Host Docker/containerd/runc and the separately managed PostgreSQL container require separate maintenance; this application update does not upgrade them.

References: [Node October security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases), [Next.js security advisories](https://github.com/vercel/next.js/security/advisories).

### Previous update: 2026-09-12

The 2026-09-12 update pins the official Node 24.21.0 LTS / Alpine 3.24 multi-architecture image by digest. Node 24 remains the production LTS choice. Update the version and digest together in both Dockerfiles when taking future security releases. Alpine's existing small footprint is retained; the backend explicitly installs OpenSSL for Prisma. The unused frontend `libc6-compat` install was removed.

Updated Next.js and its ESLint config to 16.3.5, React to 19.3.0, Tailwind to 4.3.3, Twurple to 8.1.4, Prisma/client together to 6.19.3, and the OpenAI SDK within v6 to 6.49.0. Other compatible tooling and transitive fixes are recorded in the four lockfiles. `@types/dotenv` and the direct ESLint compatibility adapter were removed. Twurple's directly imported `eventsub-base` is now declared explicitly; unused direct declarations for `api-call` and `common` were removed (Twurple still installs them transitively).

Intentional limits:

- Prisma 7 requires client/generator, adapter, and configuration changes. The retained Prisma CLI dependency tree reports three high-severity audit findings rooted in `deepmerge-ts` ([advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)). npm offers no compatible fix; no forced downgrade or unverified major override was applied. That tooling is excluded from backend runtime images but remains in the migration/build image.
- TypeScript stays at 5.9.3. Newer majors change the backend's legacy CommonJS resolution behavior and need a coordinated configuration/tooling migration.
- ESLint stays on 9.39.5 because the current React plugin's peer range excludes v10. npm marks v9 unsupported. The obsolete `next lint` script and compatibility-based config were replaced with ESLint's native flat config. Lint now runs and reports three React effect errors and two unused-import/declaration warnings in existing UI code; no rules were disabled and that UI was not changed.
- The OpenAI SDK stays on its existing major pending a separate v7 API compatibility review. Node 26 is Current rather than LTS, so it was not adopted.

## Validation on 2026-09-12

All four local package installs and production builds passed. All four Compose images built for both Linux AMD64 and ARM64 (the latter through local emulation). Build-time checks verified shared-package resolution, native Prisma engine loading on both architectures, migration CLI availability, and removal of backend development tooling. No application server or migration was run.

A fully cached AMD64 Compose rebuild took 3.21 seconds with 64 cached steps on the development machine; this is not a Raspberry Pi timing or a source-change rebuild measurement. Final AMD64 image sizes reported by Docker were approximately 226 MB frontend, 276 MB web, 304 MB Twitch, and 438 MB migration (uncompressed). The larger migration image retains Prisma tooling. Lint and the remaining Prisma audit findings are described above.

References: [Docker cache optimization](https://docs.docker.com/build/cache/optimize/), [Compose parallelism](https://docs.docker.com/reference/cli/docker/compose/#configuring-parallelism), [Next.js build cache](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache), [Node release support](https://nodejs.org/en/about/previous-releases), [Prisma 7 migration](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [TypeScript 6 changes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html).
