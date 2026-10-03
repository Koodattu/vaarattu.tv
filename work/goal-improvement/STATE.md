# Improvement goal

## Active program — stream discovery and replay, 2026-10-03

The prior local-improvement goal below was subsequently committed and deployed as
`56eafdb009138748912dbbd6576ad778f18da839`. The newly authorized product-development
and release goal starts from that clean `main` revision. Its current working record
is [stream-release/STATE.md](stream-release/STATE.md). Resume there; the sections
below remain historical evidence for the earlier goal.

## Starting state — 2026-10-03
- Revision `0956360fd4c59de5941d328b38fdfdbdee700bc0`, branch `main`.
- Clean staged/unstaged/untracked tree. No applicable on-disk AGENTS.md found; supplied global instructions apply. Read repository README and `.github/instructions`.
- One agent; no commits, external writes, deployment/configuration or policy changes.
- Product: Twitch community analytics. Main journeys: discover viewer → profile → chat/session history; leaderboard → period/category → profile; streams → detail/activity/timeline → recording/chat replay. Clips are explicitly planned, not a new feature for this goal.
- Maintained UI language is English; generated biographies may be Finnish. No i18n catalog exists. Responsive web only.
- Design: preserve dark gray surfaces, purple Twitch accent, compact community data. Scoped improvements prioritize task completion and recovery. End-user-ui-ux and Impeccable audit/product guidance loaded; context script ran with `--target frontend` (no PRODUCT.md).

## Environment / safety
- Node 24.4.1, npm 11.4.2; dependencies already installed in all four packages.
- Use per-command `git -c safe.directory=C:/Users/Juha/Desktop/Projektit/vaarattu.tv` (sandbox ownership differs).
- Existing `.env` files and Docker Compose are not test resources. Do not read secret values or launch collector/production Compose.
- Docker 29.8.0 available via escalation. No existing containers modified. Task-owned disposable container: `vaarattu-goal-01a10220-db`, localhost port 55489, matching existing integration-test guard. Recreated once for clean final integration checks; cleanup recorded below.

## Baseline
- `frontend: npm run lint`: 3 errors (profiles effect; both Twitch embed effects), 2 unused-code warnings. `npx --no-install tsc --noEmit`: passed.
- Both backend `npm run build`: passed. Web `node --test --test-concurrency=1 tests/*.test.cjs`: 19 passed, 2 DB suites skipped. Collector `node --require ts-node/register --test --test-concurrency=1 tests/*.test.cjs`: 45 passed.
- Applied all 5 migrations to disposable PostgreSQL 17.10. With guarded `VOD_TEST_DATABASE_URL`, web integration suites: 8 passed, no skips. Run serially before browser fixtures (existing recording test removes its fixture rows).
- Browser baseline: Chromium, 1366x900 and 375x812, Helsinki time, real API + synthetic DB, external browser traffic blocked. `baseline-browser.json`, `baseline-mobile.png`, `baseline-chat.png`.
- Profile search matching exactly 25 viewers enables Next, takes user to empty page, removes Previous. At 375px page is 460px wide. OS light mode produces white body behind white headings despite fixed dark interface.
- Chat history with 1,000 synthetic messages: renders 1,000 rows, 20 message requests in React development Strict Mode (10/page loop x 2). Warm observations 343/351ms; cold route 1,131ms. Byte counts are provisional because aborted duplicate requests finish asynchronously; remeasure completed successful responses separately.
- Local test ports 33101/API and 33102/web. Port 3101 was already occupied by an unrelated API; it was not used for app tests or changed. Playwright 1.62.1 added as a pinned development dependency from existing cache.

## Ranked backlog / acceptance criteria
1. **P1, high confidence, low risk/effort: unreadable light-mode shell and mobile navigation overflow.** Preserve fixed dark identity in both OS themes; all navigation fits 320px; keyboard focus and active nested route visible. Impeccable adapt/harden. Browser regression and screenshots.
2. **P1, high confidence, medium effort: unbounded chat history and profile search dead ends.** Fetch only requested page (100 messages), stable timestamp-tie ordering, no stale response replacement, retain search during errors, actionable retry, correct last-page controls and local-day groups. Profiles use server totals and preserve search via URL/back navigation. Browser + real PostgreSQL tests.
3. **P1, high confidence, medium effort: analytics correctness.** Emote platform filter occurs after pagination, total includes unused emotes; watchtime omits sessions spanning period start; stream unique viewers count sessions rather than people. Reproduce each with independent fixture expectations, correct through existing service/HTTP interfaces, measure bounded queries where changed.
4. **P2, high confidence, low/medium effort: API input handling and incomplete profiles.** Invalid/array numeric/filter inputs can reach Prisma as 500s; valid new viewers are listed but 404 before analytics generation. Reject malformed requests consistently, show empty profile for existing viewer. Do not alter authorization policy.
5. **P2: verification/setup reliability.** Wire existing backend tests, fix baseline embed lint errors at the hydration boundary, document isolated local run and browser checks; complete production build.

## Coverage and decisions
- Existing English copy conventions retained; no maintained locale files. Operational interface, scoped pass, desktop + touch-sized mobile. No redesign/new product features.
- Architecture skills: keep route/controller/service layering. Strong candidate: centralize request validation and request cancellation in existing utilities (real reuse); avoid generic repository/state abstractions. TDD seams: real HTTP against disposable PostgreSQL and rendered browser controls. Tests may simulate failed network responses at HTTP boundary for recovery/races.
- Impeccable audit (baseline): a11y 1/4 (unreadable headings in light mode, unlabeled inputs), performance 1/4 (unbounded history), responsive 1/4 (nav overflow), theming 1/4 (body override), patterns 3/4 (established data UI). Existing data hierarchy/card language retained. Next commands: adapt shell, harden search/history, polish changed surfaces.
- Database/cache assessment: no new cache needed; stream search already uses bounded TTL metadata cache. Inspect query plans before indexes. Collector tests cover optional service failures/recovery; live external integrations not invoked. Security: public moderation endpoints and AI consent defaults are pre-existing policy questions, deferred unchanged.

## Status / next action
Complete: all five batches implemented, verified and reviewed. Changes remain local and uncommitted for review. Follow `docs/local-testing.md` to recreate the isolated preview; no server or test database is left running.

## Completed batches
### 1 — readable, responsive shell
- Fixed global white-body override, applied existing Geist font, responsive wrapping navigation, nested active route, skip link and visible keyboard focus.
- Browser regression first failed on white background, then passed at 320px in light OS mode. Keyboard skip reaches main. Inspected `shell-mobile.png`; no horizontal overflow. `git diff --check` passed.
- Self-review per code-review skill: standards follow existing Tailwind/Next conventions; goal acceptance met. No policy/configuration changes. Generated Next.js AGENTS/CLAUDE files are tool output, tracked for cleanup at end.

### 2 — bounded browsing and recovery
- Chat fetch-all loop replaced by 100-message pages; search stays available during loading/failure, retry retains input, local dates and displayed times agree. Profiles now use authoritative pagination totals, URL search/page state, refresh selection and recovery controls; one column on phones keeps names/stats readable.
- Shared `useApiQuery` aborts obsolete/unmounted requests and derives pending state from request identity; API client uses a 15s timeout and readable failure messages. No cache or state dependency added.
- Browser regressions first failed at 1,000 vs 100 rows and enabled Next on last profile page. `PLAYWRIGHT_REUSE_SERVER=1 npx --no-install playwright test --reporter=line`: 5 passed, including search → profile → Back, network failure/retry, stale-response cancellation, empty/clear, all 10 history pages and local midnight. `tsc --noEmit` and targeted ESLint passed.
- Inspected `profiles-mobile.png` and `chat-mobile.png` at 375x812. Shared shell tested at 320px. No horizontal overflow, labels and compact readable history preserved. Functional browser tests exercise desktop controls too; physical devices unavailable.
- Consulted installed Next 16.3.5 guides for Playwright/search params, React effect cleanup and external-store docs, MDN AbortSignal.any. Self-review: no incomplete controls; retained random discovery and full searchable history via pages.

### 3 — accurate analytics and leaderboard journeys
- PostgreSQL regression first showed empty platform-filtered page despite two used emotes; now filter precedes pagination and total excludes unused catalog entries. Rankings use deterministic tie-breakers. UI labels emotes honestly as all-time and removes nonfunctional time controls.
- Watchtime fixture first ranked 40 minutes over a viewer with 45 (30-minute boundary overlap omitted). Now clips completed sessions to the requested interval and aggregates/pages in PostgreSQL. Ongoing sessions retain prior exclusion. UTC text binding follows existing timezone-safe query convention.
- Synthetic workload (50 viewers x 200 completed sessions; 10-result page, first request + 6 warm requests): warm median 36.695ms → 27.365ms (~25% lower). First 42.22ms → 32.44ms. `measure-watchtime.cjs`, `watchtime-before.json`, `watchtime-after.json`. Final review corrected the median estimator to average the two middle values; original timing samples are unchanged. Local synthetic results, not production claims; no index/cache added.
- Stream list/detail/timeline reported 4 unique viewers for 2 people with 4 sessions. Now distinct people counted; timeline peak reuses tested audience sweep (overlapping sessions no longer inflate peak). Sessions remain visible. Targeted backend suite + build passed (12 tests).
- Browser uncovered missing leaderboard→profile links and inaccessible reward ranks beyond first 20. Seven detailed leaderboards now share cancellable requests/retry and true pagination; reward detail has 25-row paging. Summary links added. Existing body/rows retained. Browser checks for message/emote and reward→new viewer→empty history passed. Emote screenshot captured; full review pending.

### 4 — request and profile reliability
- 18 API cases first failed: malformed numeric/array filters either accepted or returned 500, and a listed real viewer without analytics returned 404. Shared typed parsing now returns 400 before database access; positive limit cap retained; malformed sort/time range rejected. Existing viewer gets empty statistics/biography until analytics exist. No authentication/consent policy changed.
- Final real HTTP/PostgreSQL `node --test tests/api.integration.test.cjs`: 22 passed. Backend build passed. Equal-timestamp history regression verifies all five records across three pages, in deterministic descending ID order. Review caught the remaining global-search stream filter accepting malformed IDs; both cases failed with 200 before the fix and pass with 400.
- Profile uses shared query/retry and clearer failure state; removed unused StatBadge while editing. Mobile identity/biography precedes stats and sticky sidebar is desktop-only.

### 5 — integration, recovery and developer setup
- Overview could retain old reward rankings when a period request failed. Browser regression reproduced missing error feedback; independent cancellable summary/reward queries now preserve successful results, discard old-period results and offer scoped retry. This also removes its uncancelled period-response race.
- Final layout inspection found overview overflow at 320px (343px content) and truncated viewer names with 200% root text. An explicit zero-minimum grid track fixes the overview; profile card columns now follow available text space. Screenshots inspected: `leaderboards-mobile.png`, `profiles-tablet.png`, `profiles-text-200.png`. At 320/375/768px, tested surfaces stay within the viewport.
- Twitch embeds use the static hostname through a hydration-safe external-store hook, resolving both baseline lint failures without an extra effect update. Removed the unused home Image import. No production dependencies added; Playwright is the only new direct development dependency.
- `docs/local-testing.md` documents locked installation, guarded database setup, migrations, suite order, local synthetic review, browser runs, standalone production preview and cleanup. Replaced starter frontend README; corrected root Node requirement against installed Next engines and removed the nonexistent production health endpoint from API docs.
- Chat after measurement (`final-browser.json`): one completed message request, 18,550 response bytes, 100 rendered rows per run; first 323ms, warm 180/178ms. Before: 20 observed message responses and 1,000 rendered rows; warm 343/351ms. Same Chromium/development stack and synthetic 1,000-message workload. These observations are local, not a production latency claim; baseline byte counts are not comparable. All messages remain accessible through pages/search.

## Final verification
Commands are relative to repository root unless a directory is given; use the setup guide's exact disposable database URL for database checks.

- `npm.cmd run lint --prefix frontend` and `npm.cmd run typecheck --prefix frontend`: passed, no warnings/errors.
- `npm.cmd run build --prefix backend/twitch` and `npm.cmd run build --prefix backend/web`: passed.
- `npm.cmd test --prefix backend/twitch`: 45 passed, no skips. Only test doubles contact external-service boundaries.
- Fresh disposable PostgreSQL: `npx.cmd --no-install prisma migrate deploy` in `backend/shared` applied all 5 existing migrations. No new schema or index migration.
- With `VOD_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55489/postgres`, `npm.cmd test --prefix backend/web`: 53 passed, no skips. Includes analytics, request validation, history paging, recording matching/manual corrections/replay, audience activity and database timezone regressions.
- With `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:33101`, `npm.cmd run build --prefix frontend`: passed; all 15 static pages generated. Sandbox attempt failed fetching existing Google fonts; the unchanged command passed outside the network-restricted sandbox.
- Against the production build, `PLAYWRIGHT_REUSE_SERVER=1 npm.cmd run test:e2e -- --reporter=line` in `frontend`: 10 passed (6.6s). Includes home embeds, all five user-ranking categories and period selection, profile/timeline/history links, rewards and emotes, full 10-page history, local midnight, search/back navigation, stale responses, failure/retry/partial failure, mobile and keyboard focus. Expected simulated 503s recover; no unexpected page errors in instrumented journeys.
- Automatic server lifecycle: without reuse, `npm.cmd run test:e2e -- --grep 'profile search stops' --reporter=line`: 1 passed (8.0s), servers stopped automatically. The sandbox attempt stalled during repeated font-fetch warnings and was stopped; retry with network access passed. `npm start` emitted its existing standalone warning, so the guide uses installed Next documentation and the existing Dockerfile's standalone asset layout. Verified that layout with `--grep 'home embeds'`: 1 passed (2.2s).
- Visual inspection: Chromium desktop 1366x900, tablet 768x1024, phones 375x812 and 320px wide, OS light mode, keyboard skip/focus, reduced-motion setting and 200% root text. No physical-device, screen-reader or cross-engine certification. Existing spinners elsewhere were not redesigned.
- `git diff --check`: passed. Supporting screenshots/JSON/scripts are beside this log. Existing `baseline-browser.cjs` records the old failing interactions and is historical evidence, not a passing final test.

## Sequential self-review
- **Standards:** reviewed tracked and new implementation/test files against supplied instructions, repository route/service conventions and installed Next docs. Kept public response shapes and existing stack, reused pagination/query/validation seams, removed obsolete fetch-all and duplicate peak logic. No policy/configuration writes, new production dependencies, broad formatting, or unrelated source refactors. No unresolved high-priority standards findings.
- **Goal/spec:** all ranked acceptance criteria met through observable API/database/browser checks. Review found and resolved the global-search validation gap, overview partial-data failure, narrow grid overflow and enlarged-text truncation. Successful production build and guarded setup verified; all existing messages/reward ranks remain reachable. No unresolved high-priority in-scope findings.

## Coverage / deferred decisions
- Assessed frontend requests/rendering, SQL aggregation/paging, N+1 risks, existing indexes/relationships, bounded metadata cache, collectors/optional integrations, errors/validation/cancellation, navigation/recovery, UI semantics/responsiveness and setup. No measured lock/contention/storage issue justified a migration or cache change; no storage-savings claim.
- Public moderation history/search routes have no access guard (`backend/web/src/routes/mod.routes.ts`). Decide the intended public/moderator boundary before adding authentication, access controls or rate limits; policy changes were explicitly excluded.
- ViewerProfile consent defaults to true and analytics creation sets it true (`backend/shared/prisma/schema.prisma`, `backend/twitch/src/services/viewerProfileAnalytics.service.ts`). Confirm desired consent/AI-profile policy before changing collection or generation. No policy was changed.
- Lower-priority scaling candidates: period points/reward lists still aggregate some rows in application memory, and the reward overview fetches each reward's leaders separately. Current synthetic journeys complete; collect representative slow-query evidence before another optimization. Existing metadata-cache behavior retained; tests cover reuse. No speculative index added.
- Twitch/YouTube playback, OAuth, real collection, AI output and live credentials were not exercised. VOD unavailable state and real database replay/matching were verified; use authorized integration resources for live end-to-end playback. Clips remain explicitly planned. One maintained English UI, localized date formatting and existing Finnish AI content preserved.
- No deployment or migration configuration changed; no commit, push, PR or deployment. Production capacity and device-specific behavior remain unmeasured.

## Cleanup
- Stopped all manually launched test API/frontend servers; verified ports 33101 and 33102 refuse connections. Playwright's final managed run stopped its own servers.
- Stopped `vaarattu-goal-01a10220-db`; Docker's exact-name listing confirms it is gone. Its `--rm` temporary data was discarded; no volumes or unrelated containers touched.
- Removed only Next's newly generated `frontend/AGENTS.md` / `CLAUDE.md` after stopping dev. Global instructions/skills were untouched. Ignored build/test caches remain available locally.
- Final HEAD remains `0956360fd4c59de5941d328b38fdfdbdee700bc0`; no commits or publishing. Starting tree was clean, so the current tracked diff and new tests/docs/evidence are this goal's work.
