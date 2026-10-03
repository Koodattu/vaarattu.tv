# Stream discovery and replay release

## Objective and starting state

- Read `0636c769-f47f-4849-9c78-a4a3e62d207e/pasted-text-1.txt`: sustained product improvement, research, verification, commit, push and established deployment, one agent.
- Start: `56eafdb009138748912dbbd6576ad778f18da839`, `main`, origin `https://github.com/Koodattu/vaarattu.tv.git`. Staged, unstaged and untracked trees clean. No applicable on-disk AGENTS.md. Supplied instructions and `.github/instructions` read.
- Previous release already improved profiles, histories and leaderboards. Preserve those capabilities and their tests; address remaining complete user journeys.
- English UI, Finnish generated biographies; no localization catalog. Next 16 / React 19 / Tailwind 4; Express / Prisma 6 / PostgreSQL; npm. No stack or policy changes.

## Product brief

Documented: a public community companion for Twitch streamer vaarattu. Viewers browse recordings, chat memories, profiles and rankings; the streamer can inspect engagement and past streams. The collector records chat, title/game changes, presence, Twitch audience samples and linked recordings. This is an operating/reading interface, not a marketing site.

Assumptions: returning community members often remember a game or fragment of a title, and may want to revisit/share a moment. Streamer analysis is occasional and must distinguish chat presence from measured Twitch audience. No user interviews or product analytics were available; expected value remains a hypothesis until real-user feedback.

Principal journey: Home / VODs → find a stream → understand its chapters/activity → watch the relevant time with recorded chat → share/return to the same context. Preserve direct stream, watch and timeline links, provider selection, split recordings, user profiles and existing community paths.

## Environment and release

- GitHub credentials verified through escalated `gh auth status`, `gh api user`, `gh repo view`. Release branch `main`.
- `.github/workflows/deploy.yml` runs on main pushes but only prints a placeholder. It does **not** deploy or run checks. Required local gates are lint, typecheck, builds, backend suites with a real disposable database and browser journeys.
- Established deployment: `ssh raspbi5`, `/home/koodattu/vaarattu.tv`, Docker Compose sequential build then `up -d --no-build`; site `https://dev.vaarattu.tv`. The apex is a separate site. Initial remote checkout clean at the same starting revision, three services healthy, migration exit 0, 6.4 GiB free disk and 6.6 GiB available memory.
- No documented rollback command; existing images/revision can be preserved before deployment. If needed, restore the known prior service images only after checking no newer release; no destructive database rollback. No migrations selected yet.
- Dedicated task database: `vaarattu-product-0636-db`, PostgreSQL 17.10-alpine3.23, loopback 55489, 1 CPU, 384 MiB, tmpfs, auto-remove. Existing `my-postgres-db` on 5433 untouched. API33101 and frontend33102 verified unused before startup. Never load production .env or run the collector for tests.

## Research and lessons (accessed 2026-10-03)

| Source | Evidence / pattern | Decision and tradeoff |
| --- | --- | --- |
| [Twitch Stream Summary](https://help.twitch.tv/s/article/stream-summary) | Official documentation connects individual stream engagement over time to interesting moments, with interval granularity. Documentation reviewed; authenticated UI not accessed. | Keep interval definitions adjacent to activity and provide a next action to replay a moment. Avoid presenting sampled peaks as averages. |
| [TwitchTracker streams](https://twitchtracker.com/main/streams) | Public page exposes category filtering, date/calendar context and stream rows; text/controls inspected, interaction verification pending. | Offer title/game search and explicit date scope. A calendar heatmap would add unnecessary complexity for this single-community archive. |
| [YouTube chapters](https://support.google.com/youtube/answer/9884579?hl=en) | Official help describes timestamped sections supporting rewatching. | Reuse actual recorded title/game segments as chapters; do not invent AI highlights. Adapt across split recordings using saved offsets. |
| [YouTube timestamp sharing](https://support.google.com/youtube/thread/425735532?hl=en&msgid=426265443) | TeamYouTube announcement describes sharing exact video times on desktop/mobile. Source claim, not tested native behavior. | Make moment links reproducible and useful on touch/keyboard. No account or persistence infrastructure needed. |

Manual workaround: page through thumbnails, remember a stream/date, open detail and watch separately, then scrub the provider video. Current fuzzy `/streams/search` serves recording identification (10 candidates and heuristic matches), not paginated archive browsing; preserve that external contract and extend the existing list endpoint for browsing.

## Ranked program and acceptance criteria

1. **P1 archive discovery (high confidence, medium effort):** no search/date filters or recording status; page resets on navigation, failures have no retry. Add server-side title/game search, date bounds and available-recording filtering; reliable totals and stable order; URL-backed filters/page; status visible before opening; recovery retains inputs; home previews share the same representation. Verify combined filters, midnight/DST dates, partial/missing recordings, ties, pagination, Back/refresh, narrow layouts and failures.
2. **P1 moment navigation (high confidence, medium effort):** segments are inert and activity has no route into the recording; watch always starts at zero. Chapters and activity selections link to `watch?t=seconds`; map stream time to the correct provider/part, preserve timing through source changes and share links; handle gaps, invalid time, unavailable recordings and provider failures honestly. Verify via real stream API and provider-boundary test doubles.
3. **P1 analytical comprehension (high confidence, medium effort):** current overlaid dual-axis chart has 600px minimum width, three independent series, and no data table. Replace with a single clearly labeled selectable metric, visible selected values, an explicit peak jump, no horizontal chart panning on mobile, and accessible interval table. Keep zero distinct from missing and show data-source/aggregation caveats. Verify known fixture values, intervals, missing samples, keyboard and mobile.
4. **P2 supporting reliability (evidence-led):** reuse cancellable request/retry hook; inspect stream list query/payload scaling and player lifecycle while changing those paths. Optimize only measured friction. No speculative cache/index/schema changes.
5. **Deferred/outside this release:** clips ingestion needs a larger collector/integration feature; existing moderation access and consent policy need owner decisions; OAuth, achievements/wiki/setup are not justified by this journey. These are considered missing capabilities, not silently forgotten work.

## Design and skill application

- Read end-user-ui-ux, Impeccable, Interface Design, research, visualization router/strategy, dashboards, statistical uncertainty, diagnosing-bugs, TDD and both architecture skills. Remaining phase references loaded progressively. No missing skills so far.
- One primary visual discipline: **Interface Design** for a community archive and analytical tools. Preserve the established dark neutral/Geist/purple identity; use compact metadata and one main evidence area. Impeccable audit/critique is secondary QA guidance. Context launcher ran once successfully; it missed subdirectory implementation, so repository/browser evidence governs.
- Explicit user autonomy replaces interviews/concept approvals and research/architecture subagents with documented decisions and sequential self-review. No fabricated user approval or independent review.
- Structural choices considered: (a) calendar-first archive, (b) all-in-one player/dashboard, (c) searchable archive + focused overview + linked replay. Choose (c): serves discovery and revisiting, preserves deep links, avoids loading two provider SDKs/charts in every archive card. No generated concept needed to resolve this layout.
- Domain: broadcasts, chat memories, game changes, replay, recordings, community. Colors: slate stream frame, Twitch purple action, white captions, muted metadata, amber unavailable status. Signature: a chapter time is a link into the community's recorded stream and chat. Reject equal KPI card grids, purely decorative thumbnail placeholders, and hover-only evidence.
- Reuse request/pagination utilities and native controls. A shared stream-card implementation earns its reuse on archive/home. Keep recording offset decisions near playback; avoid introducing a generic state or chart framework.
- Test seams selected autonomously: real HTTP + disposable PostgreSQL for listing/validation/data; browser UI for complete flows/URL state; external player SDK boundary doubles for seek/source/change/end/error lifecycle. Literal fixture expectations, not implementation snapshots.

## Baseline and progress

### Baseline

- Fresh disposable DB: all 5 existing migrations applied. Task servers: synthetic API33101 and Next dev33102; no collector. Fixtures: 27 streams, 3 categories, 1500 chat messages, a sampled audience gap, Twitch/YouTube/absent recordings, split parts and long chapter titles. Existing community fixtures retained.
- `node work/goal-improvement/stream-release/inspect-streams.cjs`: baseline screenshots and JSON inspected. Archive search controls=0, chapter links=0; chart width600px on a375px viewport, chart pushed below stacked summaries. API12-stream response8635bytes; six warm reads8.2–16.1ms. This does not justify an index/cache; maintain bounded query work.
- Public TwitchTracker browser visit met its `Just a moment` gate. Do not bypass; record only the controls visible in the web tool's page representation. Its interactive filtering remains unverified.

### Batch 1 — archive discovery (verified)

- Added literal case-insensitive title/game search, inclusive Helsinki date filters and available-recording filter to existing paginated endpoint. Both totals and rows share one predicate; date tests cover 23h/25h days. Stable timestamp+ID ordering. Additive `recordingSources` field matches existing playback availability rules and includes YouTube without thumbnails. Existing fuzzy recording-identity endpoint untouched.
- Real API test first returned an unrelated stream for a title; new filters initially returned all rows and invalid dates returned200. `node --test tests/streamArchive.integration.test.cjs tests/streamThumbnails.test.cjs`:6 passed after fixes. Backend build passed.
- URL-backed archive form, paging, clear/reset, retry and empty/out-of-range recovery. Shared StreamCard on archive/home replaces inconsistent thumbnail/metadata code. Mobile uses compact rows; desktop uses three preview columns. Detail Back link preserves archive filters/page. Existing API query cancellation reused.
- Browser search → available recordings → page2 → refresh → detail → return passed. Recovery/date/narrow-width cases in progress. Typecheck and lint passed. Inspected first desktop/mobile screenshots; reduced search input basis to keep Search beside it on phones and made thumbnail width proportional for text scaling. Two bounded visual passes remain, with final integrated review.
- Applied end-user flow/state guidance, Interface Design hierarchy/reuse, Impeccable craft-floor/adapt, visualization shareable-state/mobile/a11y/testing references. Single-context self-review; no delegated or independent assessment.

### Batch 2 — linked moments (verified)

- Chapters are real segment timestamps reused on overview/watch. Playback URL stores stream seconds and optional source; stream time resolves to provider-relative time and the correct split part. Source switches and next-part playback preserve URLs; autoplay is transient and clears on refresh. Missing coverage gets a recovery list, never an implicit jump to zero. Provider fallback links include the position; copy links have a manual-copy fallback.
- Before implementation, browser test failed because chapter links were absent. After: archive, existing unavailable VOD/timeline, chapter→part2 at1800s, synchronized captured chat, earlier chapter, next-part autoplay and refresh all passed (4 tests). Typecheck passed. Lint found a React compiler memoization issue in recording selection; explicit memoization added, verification pending.
- Provider adapters retain external SDK boundaries. Primary technical docs consulted: [YouTube iframe API](https://developers.google.com/youtube/iframe_api_reference), [Twitch embeds](https://dev.twitch.tv/docs/embed/video-and-clips/). Browser tests use provider SDK doubles and real internal API/data; these do not certify remote media availability.

### Batch 3 — analytical contract (implemented and verified)

- Question: when did captured chat or sampled audience peak, and what was happening then? Choose one step-line metric at a time, a zero baseline, direct units and selected-interval values. Keep all original metrics available. Reject dual axes (independent scales can imply a relationship) and stacked miniature charts (too tall on phones).
- Single SVG instance, at most300 intervals from existing API, no chart dependency. ResizeObserver measures its container so tick labels stay CSS-readable on375/320px phones rather than scaling a900px drawing. No animation, sensor permissions, drag capture or hover-only information. Native range, previous/next and peak buttons provide keyboard/touch alternatives; an optional data table exposes exact values.
- Purple focal line, neutral grid, white selected values, amber stale/unavailable status. Geist; 4px spacing base, 16px content padding, controls at least44px. On desktop chapters sit beside the chart; on mobile the chart precedes chapters. Metadata remains compact above the evidence.
- `metric` and committed `at` live in URL; interval movement replaces history, metric changes push; moment links preserve the view. Null audience stays missing; zero captured messages remains zero. Source and interval caveats stay visible; partial refresh keeps prior data labeled stale. Table renders only on expansion. A single-query-hook extension retains the last successful response only for the same request identity.
- Read accessibility/testing visualization specialists and shareable-state/mobile foundations. Numeric fixtures independently expect audience peak72 at40min, missing25–35min and captured-chat peak30/min. Next browser check failed on absent metric selector before the redesign.

### Integrated verification and corrections

- Implemented all three selected batches. Source switches preserve stream time; split parts, gaps, invalid times, clipboard denial, SDK failure/retry and SDK-never-ready recovery are exercised through the real page/API. These use doubles only for external player SDKs; actual provider media availability is not certified.
- Rapid metric change followed by peak selection exposed stale search parameters during asynchronous router navigation. The existing browser regression went red (messages/30 instead of viewers/72). Changed only client-side analytical selections to Next's documented native History API, using the current URL at each event. Targeted four-test run passed, then the complete production-build browser suite passed. No chart network request is needed to change metric/interval. Installed Next linking/navigation and SPA guides confirm this integration with useSearchParams.
- Strict production compilation caught an unsafe required-property cast in the clipboard test helper; made the test-only optional property explicit. Lint/typecheck/build then passed without exceptions or disabled rules.
- The first combined browser run passed17/18: the recording integration suite intentionally leaves two synthetic streams, making the archive count29 instead of27. Confirmed the leftover records in that suite and recreated only the disposable database between phases; did not weaken the expected count. The isolated testing guide now documents that separation. Final browser run:18/18 passed in14.0s.

### Final checks (2026-10-03)

All commands ran from the repository root unless noted. The exact disposable URL is in the local testing guide; no real collector or external side effects were used.

| Gate | Result |
| --- | --- |
| Fresh `prisma migrate deploy` in backend/shared | All5 existing migrations applied; no new migrations or schema changes |
| `npm.cmd run build --prefix backend/twitch` and `--prefix backend/web` | Both passed |
| `VOD_TEST_DATABASE_URL=… npm.cmd test --prefix backend/web` |58 passed,0 skipped |
| `npm.cmd test --prefix backend/twitch` |45 passed,0 skipped; expected external-error logs are test scenarios |
| `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:33101 npm.cmd run build --prefix frontend` | Passed; actual standalone artifact served locally |
| `npm.cmd run lint --prefix frontend`, `npm.cmd run typecheck --prefix frontend` | Both passed |
| `PLAYWRIGHT_REUSE_SERVER=1 npm.cmd run test:e2e --prefix frontend -- --reporter=line` |18 passed against standalone build, real fixture API/PostgreSQL; zero unexpected page errors |
| `EVIDENCE_PHASE=final node work/goal-improvement/stream-release/inspect-streams.cjs` |27-stream workload asserted; desktop/mobile/tablet, peak selection,200% root text scaling, archive and player recovery captured; no page errors |
| `git diff --check` | Passed |

Browser coverage includes the existing home/profile/history/leaderboard/timeline journeys as well as archive query/date/recording filters, pagination, Back/refresh, retry/empty/out-of-range states, chapter→split video→synchronized chat, provider source changes, link copying, player errors/timeouts, one-metric activity, missing samples, keyboard intervals, peak replay and retained snapshots after refresh failure. Screenshots were opened and visually inspected at1366,768,375 and320px.200% root font sizing caused no horizontal page overflow; this is a layout check, not a screen-reader or WCAG certification. The existing sticky navigation occupies more vertical space at enlarged text. Provider embeds were deliberately blocked in recovery screenshots.

### Before/after evidence and performance interpretation

- `baseline-*.png` vs `final-*.png`: search controls0→1; chapter links0→clickable real chapter times; chart600px→309px on a375px viewport. No page overflow at320/375/768px. `activity-320.png` and `activity-768.png` show the independently expected72-person peak at40:00 and the missing-sample gap. Optional table exposes exact values.
- `baseline.json` / `final.json`: same27-stream,1500-message local workload,12 returned streams. Response8635→8970bytes (+335bytes,3.9%) for recording metadata. First request31.0→11.6ms; six subsequent reads8.2–16.1ms before and9.9–14.9ms after. These are short synthetic local samples, not controlled production speedup evidence. No cache/index/storage change is justified or claimed. Dev and production frontend captures differ, but the measured endpoint is the same local Express API.
- `final-archive-mobile.png` confirms compact rows and Search beside the input after the first responsive refinement. `final-watch-*.png` documents bounded player recovery and chapters. Prior community screenshot names remain historical; current regression captures live beside this record.

### Sequential self-review and coverage decision

- **Standards:** reviewed complete tracked/untracked diff against clean startingSHA and supplied/repository instructions. Preserved API routes/response fields, parameterized Prisma queries, service/controller boundaries, maintained English UI and existing native-control/request-hook conventions. Extracted shared cards/chapters/recording-time helpers at actual reuse points. No production dependencies, secret files, schema, policy, deployment settings or unrelated changes. Native History API is supported by installed Next, not a custom routing workaround. Manual-submit archive search follows the already established profile form and commits related date/recording filters together.
- **Spec:** complete discovery→overview→moment→playback→share/return journey, including unavailable/error/empty cases and prior community regression coverage. Fixed the metric-navigation race and test-environment mismatch before release. No remaining high-priority selected acceptance failures. This is one agent's two-axis self-review, not independent review.
- Impeccable detector ran once on the VOD/home targets; `design-scan.json` contains one purple heading-color warning. Retained the existing flat purple Twitch accent under the product's pinned brand, without adding a gradient or suppressing detector rules. Desktop/mobile visual review confirms usable density, direct data labels, native controls and no decorative motion. Interface Design remains the single primary visual discipline.
- Backend validation, pagination, query work, cancellation, player lifecycle, data meaning, accessibility, responsive layout, architecture/locality and developer setup were assessed. Bounded query work did not justify speculative performance/schema work. Deferred clips/identity/moderation/consent ideas remain outside this coherent release; no new roadmap or policy was invented.

### Release preparation

- Pre-deploy Pi checkout clean at56eafdb; three services running,6.4GiB available disk,6.6GiB available memory. Existing Compose deployment procedure preserved. No deployment/migration configuration edits.
- Previous runtime image IDs for rollback provenance: frontend `sha256:84afdcc85e0801576d1549bd7a5e530f445953814dfa446ed650dbd9fdb16c63`; web `sha256:e6e6e8f5e79f6f1e89c7a340ff0e4aa7de62376cc087dfd49fc119ca0c85cc23`; collector `sha256:6028e960b42a9ac008ca325a7487b9397f730029a6327f0e14fddf62904cb72d`; migrate `sha256:90bcbcc14f295f16eabffeb5bd20b4fbdf14aeaae4633ac5cb739571bdc817c9`.
- Local fixture API and standalone frontend stopped; task PostgreSQL container removed; Next-generated untracked instruction files removed after dev shutdown. Existing user containers and configuration preserved.
- Next: stage/review/commit this coherent release; pushmain; fast-forward raspbi5 to exactSHA, sequential Compose build, up without rebuild; verify process/migration state, revision and public UI/API.
- The final response and local ignored `release-verification.log` will record the immutable releaseSHA, workflow result and live checks after deployment. This avoids modifying the verified commit merely to insert its own hash. See [local testing](../../../docs/local-testing.md) and [stream contract](../../../docs/stream-browsing.md) for reproduction.
