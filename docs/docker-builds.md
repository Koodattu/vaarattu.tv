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
- Each service installs from its lockfile before copying source. Its production dependency stage is independent of source changes. Runtime images contain compiled JavaScript, production dependencies, and the generated Prisma engine. The migration image retains Prisma tooling but does not compile either service.
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
