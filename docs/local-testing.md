# Isolated local verification

The web API and browser tests can run with synthetic data, without Twitch,
YouTube or OpenAI credentials. Use Node.js 24 (the version used for verification),
npm, Docker and an available Chromium browser for Playwright.

Run these PowerShell commands from the repository root. On other shells, use
their environment-variable syntax and `npm` in place of `npm.cmd`.

## Install the locked dependencies

```powershell
npm.cmd ci --prefix backend/shared
npm.cmd run db:generate --prefix backend/shared
npm.cmd ci --prefix backend/web
npm.cmd ci --prefix backend/twitch
npm.cmd ci --prefix frontend
Push-Location frontend
npx.cmd --no-install playwright install chromium
Pop-Location
```

## Create a disposable database

Use an unused container name and port 35489 (the former 55489 can be reserved by
Windows' dynamic excluded-port ranges). The integration tests and browser
fixture server deliberately accept only the URL below. Do not reuse a database
containing data you want to keep: the existing recording suite clears tables.

```powershell
$testContainer = 'vaarattu-local-tests'
docker run --detach --rm --name $testContainer --publish 127.0.0.1:35489:5432 --memory 384m --cpus 1 --env POSTGRES_HOST_AUTH_METHOD=trust --tmpfs /var/lib/postgresql/data:rw postgres:17.10-alpine3.23
docker exec $testContainer pg_isready -U postgres
$env:VOD_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:35489/postgres'
$env:DATABASE_URL = $env:VOD_TEST_DATABASE_URL
Push-Location backend/shared
npx.cmd --no-install prisma migrate deploy
Pop-Location
```

Wait for `pg_isready` to report accepting connections before applying migrations.
This container stores its data in temporary memory and removes itself on stop.
Do not use the application's Docker Compose stack or existing `.env` database
for this workflow.

## Checks and database regressions

```powershell
npm.cmd run lint --prefix frontend
npm.cmd run typecheck --prefix frontend
npm.cmd run build --prefix backend/twitch
npm.cmd run build --prefix backend/web
npm.cmd test --prefix backend/twitch
npm.cmd test --prefix backend/web
```

The recording and clips integration suites import the collector's compiled services, so
build `backend/twitch` before the web tests. Both test scripts run serially. Web
database suites skip when `VOD_TEST_DATABASE_URL` is absent; a run with skips does
not verify database behavior. The collector suite uses external-service test
doubles; its expected error-path logs do not require live API keys.

Run the web suite on a fresh database **before** browser fixtures. To repeat it
after browser testing, stop the test servers and recreate only your disposable
container, then apply the migrations again.

The existing recording integration suite leaves some synthetic records behind.
After the web suite, also recreate this disposable container and reapply the
migrations before seeding browser fixtures. Browser scenarios expect their own
27-stream dataset; do not mix the two suites' records or relax count assertions.

## Browser journeys

With the database ready, leave ports 33101 and 33102 free, then run:

```powershell
npm.cmd run test:e2e --prefix frontend
```

Playwright starts and stops the real API routes with synthetic fixtures and the
Next development server. Tests check the API fixture identity and block browser
requests outside these two local origins. Fixtures include 26 viewers, 27 streams,
1,500 messages spanning Helsinki midnight, rewards, emotes, gifts and cheers.
The archive has three games, long chapter titles, unavailable recordings, split
YouTube parts, Twitch alternatives and gaps in recording/audience coverage.
The fixture API never loads `.env` files or starts the live collector.
Clip fixtures add 15 available clips and one unavailable permalink, with featured
flags, multiple games, dates and a missing thumbnail. They contain no real Twitch media.

Coverage includes discovery → profile → histories, leaderboard pagination and
filters, retries and partial failures, stale requests, local calendar dates,
VOD detail/timeline/unavailable playback, archive filters and pagination, linked
chapters, split-recording offsets, synchronized chat, source switches, shared
moments, activity peaks/gaps, refresh recovery, mobile and keyboard navigation.
Clips coverage includes home previews, search/filter/page preservation, empty and
error recovery, watch/share links, a stalled iframe, and narrow-screen fallback.
Player SDKs are doubled at the external boundary; this verifies our playback
mapping and recovery, not the availability of real Twitch or YouTube recordings.
Failed runs save traces in `frontend/test-results`; screenshots are written to
`work/goal-improvement/stream-release`. These are synthetic records only.
Clips screenshots and the review log are under `work/goal-improvement/clips`.

For manual review, start these commands in separate terminals:

```powershell
$env:VOD_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:35489/postgres'
node backend/web/tests/browser-server.cjs
```

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:33101'
npm.cmd run dev --prefix frontend -- --hostname 127.0.0.1 --port 33102
```

Open `http://127.0.0.1:33102`. The manual preview can load external Twitch embeds;
the automated browser tests block them. With these exact test servers running,
set `PLAYWRIGHT_REUSE_SERVER=1` to run tests against them.

## Production build

Stop the development server before building. The existing `next/font/google`
configuration needs access to Google Fonts during the build.

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:33101'
npm.cmd run build --prefix frontend
Copy-Item -LiteralPath frontend/public -Destination frontend/.next/standalone -Recurse -Force
Copy-Item -LiteralPath frontend/.next/static -Destination frontend/.next/standalone/.next -Recurse -Force
node -e "process.env.PORT='33102'; process.env.HOSTNAME='127.0.0.1'; require('./frontend/.next/standalone/server.js')"
```

This builds a local verification artifact with a local API URL. It is not a
deployment build. Keep the synthetic API running; `PLAYWRIGHT_REUSE_SERVER=1`
also supports verifying this production server. The asset copies follow the
existing Dockerfile's standalone layout. `npm start` can serve the build locally
but Next emits a warning because the project uses `output: "standalone"`.

With these servers running, capture the bounded stream workload and responsive
screenshots with:

```powershell
$env:EVIDENCE_PHASE = 'final'
node work/goal-improvement/stream-release/inspect-streams.cjs
```

## Cleanup

Stop manually launched servers with Ctrl+C, then remove only your test container:

```powershell
docker stop $testContainer
Remove-Item Env:VOD_TEST_DATABASE_URL, Env:DATABASE_URL, Env:NEXT_PUBLIC_API_BASE_URL, Env:PLAYWRIGHT_REUSE_SERVER -ErrorAction SilentlyContinue
```

The improvement evidence, starting revision, measured workloads and final
verification results are recorded in [the work log](../work/goal-improvement/STATE.md).
