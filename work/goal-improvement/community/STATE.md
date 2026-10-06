# Community discovery improvement — 2026-10-06

## Starting state and constraints

- Clean `main`, `07c708b18f202fb2098422ae52db092fe1f8d70e`; origin `https://github.com/Koodattu/vaarattu.tv.git`. Preserve existing public routes, data, English UI and Finnish generated biographies. No i18n catalog exists.
- Supplied AGENTS instructions and repository `.github/instructions` read. No additional on-disk AGENTS found. One agent only. No policy, infrastructure, deployment configuration or major dependency changes authorized.
- Live checkout on `raspbi5:/home/koodattu/vaarattu.tv` is clean at the same revision; three Compose services running, 5.9 GiB disk available. Established destination `https://dev.vaarattu.tv`; apex is unrelated. Push-to-main GitHub workflow only echoes a placeholder, so all required checks run locally before push. Release uses existing sequential Compose builds followed by `up -d --no-build`; preserve previous image IDs/tags before rollout. Application rollback uses prior images after checking no newer release; do not roll back data destructively.
- GitHub auth/user/repository verified with escalated gh; sandbox lacks keyring/network access. Use per-command Git safe.directory, never global config.
- Node 24.4.1 / npm 11.4.2. No live collector, production database, real messages or provider writes in local tests. Existing `my-postgres-db` on5433 is unrelated and untouched.
- Initial disposable Docker launch on55489 failed: Windows reserves55438–55537 (confirmed with `netsh interface ipv4 show excludedportrange`). Move the exact guarded test URL to loopback35489 across active fixtures/tests/docs; keep strict URL assertions. No host networking/reservation change. Task container `vaarattu-goal-1006-db`, PostgreSQL17.10, tmpfs,384MiB,1CPU,auto-remove. Preview ports33101/33102.

## Product brief and standard

Documented: a personal Twitch community site for vaarattu, with viewer profiles, community rankings, searchable clips, recording replay and chat/presence history. Viewers discover each other and revisit stream moments; streamer/moderator analytics share the same public UI. Assumption: returning viewers want to find themselves/friends and compare recent activity without reconstructing prior filters. No interviews or analytics are available.

Preserve: dark gray surfaces, restrained purple Twitch accent, Geist typography, searchable VOD/clip URLs, accessible recovery states and existing API layering. Operational ranking/browsing surfaces; readable biography content. Standards: a selected period/category survives detail/back/refresh; one can reach a specific viewer's actual ranking without scanning pages; exact values and units remain clear; desktop and320px mobile retain readable identity/data; failed requests preserve controls and retry.

## Skills and decision process

Software-engineering + verification, product-ui-ux, Impeccable4.5 context/critique/Operate/craft-floor, Interface Design. Context loaded once using the Windows launcher from repository root. No PRODUCT/DESIGN or interface system exists; existing implementation and historical records establish the incumbent world. Scope is an extension/refinement, not a replacement world.

⚠️ DEGRADED: single-context (user explicitly requires one agent). Design and mechanical/browser reviews run sequentially as self-review. Questions skipped: routine product/design selection explicitly delegated in the goal. No fabricated human approvals, concept-selection interactions or independent-review claims. Use source + real browser; no decorative mockup is needed for the present uncertainty.

## Discovery / next action

Read prior released work before selecting new scope. Profiles/chat/recordings/clips have substantial prior regression coverage. Initial code evidence: ranking category pages store period/page only in React state, so URL/back/refresh continuity is suspect; rankings have no viewer lookup. Reproduce in the running synthetic app before selecting implementation. Inspect adjacent profile and reward journeys, consult three relevant first-party comparables, then rank candidates.

Coverage initially: release/setup inspected; current ranking, profile and cross-product browser behavior unassessed. Prior logs are historical evidence, not proof of current completeness.

## Discovery pass 1 / selected batch

- Live local browser: overview Past Week → Messages → select Past Month leaves URL `timeRange=week`; reload visibly selects Past Week. The new Playwright regression failed on the unchanged URL before implementation. Baseline screenshot `rankings-baseline.png`.
- Current screens have no viewer lookup, and comparing categories requires returning through the overview. Existing gift-event/cheer counts, profile links and reward ranks must be retained.
- Selected outcome: searchable five-category viewer rankings, with stable whole-population positions, persistent period/search/page state and direct category switching. Reward/emote navigation also needs continuity. Confidence high for lost state and navigation friction; benefit of name lookup is an evidence-informed product hypothesis.
- Alternative structures considered: one huge cross-metric table (poor mobile fit and mismatched units); a separate “find my rank” tool (fragments the task); extend the existing category routes with shared controls/table (selected: preserves deep links, focused comparison and existing APIs).
- Intent: returning community viewer finds a person and compares their activity. Hierarchy: page/category, nearby period and name controls, then aligned rank/name/value. Palette/depth: existing gray950/800/700 surfaces, purple selection/link accent, restrained borders. Geist16px body/30px heading, 4px spacing base,44px controls, compact rows with tabular numbers. Usernames distinguish similar display names. Native semantics; no decorative motion or new UI dependency.
- Implementation in progress: rank in SQL before name filtering, literal case-insensitive substring matching, stable viewer-ID tie order, database paging/counts. Existing all-time profile snapshots vs period source records retained. SQL period points aggregation replaces per-redemption transfer because lookup now requires a globally ranked population. No schema/cache changes.

## Research record (accessed 2026-10-06)

| Reference | Evidence and lesson | Decision |
| --- | --- | --- |
| [StreamElements leaderboard](https://docs.streamelements.com/chatbot/commands/default/leaderboard) and [points lookup](https://docs.streamelements.com/chatbot/commands/default/points) | First-party docs distinguish a top-list preview, full public leaderboard, and named viewer lookup returning a global position. Docs verified; no account or live bot interaction. | Keep browsing and targeted lookup on the same ranking surface. Display actual rank rather than renumbering filtered results. |
| [Streamlabs leaderboard panel](https://streamlabs.com/content-hub/post/leaderboard-panel-extension-show-off-your-top-supporters) | First-party walkthrough describes multiple community metrics, exact amounts and configurable periods. Updated2026; source claims, not measured user outcomes. | Preserve exact values, explicit units, category/period choice; avoid adopting its wider monetization suite. |
| [Twitch leaderboard guide](https://help.twitch.tv/s/article/leaderboards-guide?language=en_US) | Search index describes switching enabled leaderboards; direct help page returns a CSS/loading error. Only the indexed pattern is verified. | Contextual category navigation is consistent with the familiar Twitch task; no claim that this implementation matches a tested current Twitch interaction. |
| Manual workaround | Repeated page scanning or leaving the website for a bot lookup, then remembering the period while switching screens. Directly observed scanning-only controls; no real user interviews. | Shareable URL state and lookup remove repeated work without requiring accounts. |

## Current verification / checkpoint

- New branch `codex/community-discovery`. Exact guarded local test port changed35489; all six existing migrations applied successfully to the disposable DB. Windows excluded range unchanged.
- Frontend typecheck and web build pass after initial implementation. Focused browser checks: lookup→category→profile→Back passes, and existing five-category/home/presence journey passes. Period regression now passes URL/refresh but its final assertion raced overview navigation; added an explicit expected-overview URL wait before browser Back, retaining the intended assertion.
- Running screenshot self-review: clear rank/name/value columns, supporting login, preserved dark identity. Mobile review, full recovery/race cases and broad discovery remain pending.
- New real PostgreSQL ranking suite covers all five metrics/all+week, ties, literal wildcard characters, search by display/login, page counts and absent names. Not yet run. Next: run isolated DB suite, then current browser tests/mobile; complete URL continuity and review the profile-to-rank entry point.

## Completed batch 1 and discovery pass 2

- Targeted real PostgreSQL/API suites:41 passed, no skips. All five metrics preserve global ordinal positions under search; literal `%_`, case folding, ties, pagination and no matches verified. Existing overlapping-watchtime and distinct-viewer regressions still pass. API rejects repeated/oversized search.
- Six new browser scenarios now cover lookup/category/profile/back/refresh, period/overview history, failure/retry with retained input, empty search/clear, stale pages, invalid URL fallback, reward detail paging, emote platform continuity, keyboard Enter and mobile selectors. They use the real fixture API/database; failure/long-copy responses are injected only at the HTTP boundary.
- Mobile screenshot found seven category links plus period buttons pushed the answer below the viewport. Native labeled selectors below640px resolved that observed hierarchy gap. `lookup-mobile.png` shows the found viewer and exact value in the first320×812 screen;320/375/768/1366 layouts inspected/captured.
- Rapid period→category regression initially lost the new period. Kept the rapid test and fixed query-only navigation with Next16's documented integrated native History API, plus latest-URL reading for mobile category selection. Category route changes still use Next Link/router. Installed Next linking/navigation documentation inspected; not an ad hoc router workaround.
- Profile→rank entry now exists. Reward overview titles link straight to period-specific detail. Existing gifts/cheer event counts, all public routes and snapshot/source-data semantics retained.

## Completed batch 2 — period accuracy and adjacent readability

- New discovery: the previous `new Date(year, month-1, day)` overflows on March31. Executed the original formula:2030-03-31T12:34:56.789Z produced2030-03-02T22:00Z (March3 local), rather than the prior month's final day. Replaced with rolling UTC month/year boundaries clamped to the last valid day; week remains seven days. Unit cases cover ordinary/leap February, prior December, leap-year subtraction, exact milliseconds and no input mutation. Passed.
- Long synthetic profile name/biography made a320px page1233px wide. Name/biography wrapping and fixed-layout statistics table restored320px. At200% text the page remained343px wide; DOM diagnostics showed no overflowing main elements, and the footer's non-wrapping links were the remaining cause. Wrapping that group resolved the regression. This is a concrete shared-shell fix, not a visual redesign.
- Reward rows now omit empty thumbnail space and stack totals below names on phones, preserving readable full titles/counts. Enlarged-text profile and mobile reward checks pass. Normal desktop identity/biography layout preserved.

## Measurement

`VOD_TEST_DATABASE_URL=...:35489/postgres node work/goal-improvement/community/measure-rankings.cjs` loads the actual starting service and its original types into temporary files, checks25 independently calculated leading scores in both versions, verifies lookup position100, and rolls back all fixture rows. Temporary files removed in `finally`.100 synthetic viewers/14,950 redemptions, seven alternating samples per implementation, median of six after the initial sample:113.454ms before,27.584ms after,24.675ms lookup. Local Windows Node24 + PostgreSQL17.10/1CPU/384MiB, warm inserted pages; no production latency claim. `ranking-measurements.json` stores all samples. No speculative index or cache added.

## Final discovery and completed refinement

- All ranking query-only navigation, including overview, rewards/detail and emotes, now uses the same synchronous URL mechanism. The rapid mobile rewards → period → category regression passes without adding a wait to hide the race.
- Final rendered review reopened the profile text-scaling criterion: eliminating overflow alone still left the long name in a narrow column beside the avatar and split statistics labels into fragments. The header now wraps as a group; semantic definition-list facts stack label/value pairs when space is limited. Reduced phone biography padding makes more room for the text. Final `profile-text-scale.png` was visually inspected; labels and values remain readable at 320px/200%, with no horizontal scrolling. No animation added; existing focus outlines retained.
- Broader current-product discovery revisited home, profile directory/detail, a 1,000-message history, the 27-stream archive, populated stream details/chapters/activity, and the 15-clip catalogue. Hierarchy, units, honest unavailable states and onward links remain useful. The current production browser suite exercised their actual search, filters, return paths, playback mapping and failures.
- Manual in-app browser navigation directly to these observed routes rendered successfully. Its click/Enter automation failed to advance some links despite fresh tabs; after inspecting tool guidance and console output, used direct-route visual inspection plus the repository's passing Playwright interactions. Do not count those manual clicks as successful journey verification. Home's real Twitch iframe produced external authentication/integrity warnings; no local application exception was observed. Automated scenarios block external services.
- Impeccable mechanical scan over the changed ranking/profile/footer surfaces returned zero findings (`design-scan.json`). Subsequent profile layout refinement received rendered self-review. This remains a single-agent self-review, not an independent audit or accessibility certification.

## Current coverage and remaining candidates

| Journey / concern | Current evidence and status | Remaining limitation / next useful investigation |
| --- | --- | --- |
| Home → community / recordings / clips | Inspected populated overview and onward links; current browser regressions verify navigation, independent loading failures and narrow layout. Satisfactory for those criteria. | Real-user feedback on which entry point is most useful; no measured engagement claim. |
| Rankings → lookup → category → profile → Back | Verified all five metrics in PostgreSQL; browser rank 25 stays 25 under filtering; period/search/page survive refresh/Back. Keyboard, recovery, stale pages and immediate mobile switching pass. | Very large populations need a representative workload before any indexing/cache proposal. |
| Rewards / emotes | Verified reward detail paging, period return context and platform URL state; inspected mobile reward rows. | Reward overview still makes per-reward queries. A bounded synthetic community showed no user-facing delay; batching is a measurement-led follow-up, not an assumed bottleneck. |
| Profile → histories | Current suite verifies search round trips, newest-first pages, local midnight, empty/stale response handling and presence retry. Long-name/biography/200% screenshots inspected. | Human screen-reader and physical-device testing not performed. Generated-biography factual quality needs owner/user evaluation. |
| Recordings → chapter / activity → replay | Current suite verifies split offsets, source changes, shared moments, missing coverage, stalled player recovery and retained activity selections; archive/detail inspected again. | Real Twitch/YouTube media availability is outside synthetic player-boundary verification. No claim of provider certification. |
| Clips → watch / share / source stream | Current suite verifies filters/page/Back, small-screen fallback, unavailable clips, failure/retry, clipboard fallback and exact VOD offset; catalogue inspected again. | No new collection policy or production-data mutation used for testing. |
| Data meaning / correctness | UTC rolling periods clamp month/year boundaries. Stable ordinal tie order, current-price points, completed chat-presence time, snapshot freshness and anonymous exclusions documented and tested. | Historical reward prices cannot be reconstructed from current schema; gathering them is a distinct future data-model decision. |
| Performance / database | 100 viewers / 14,950 redemptions: correct top 25 in both versions; warm median 113.454 → 27.584 ms. API transfers one page and count. All six existing migrations applied to fresh disposable PostgreSQL. No schema, storage-retention or cache change. | No production-load benchmark or exhaustive query-plan survey; adding indexes without such evidence is speculative. |
| Access/privacy boundaries | Source inspection found `/api/mod` mounted without an authentication middleware and `ViewerProfile.consent` defaults true. No policy change made. | Owner decision required: define intended public data/access and consent behavior before enforcing it. This is outside the goal's authorization, not a completed security review. |

Stopping assessment: the discovered lost-state, missing lookup, month-boundary and narrow-layout problems are resolved and their full paths verified. Final broad discovery found no additional material, evidenced, feasible defect within the delegated boundary. The strongest remaining concern is access/consent policy, which explicitly requires separate authorization. Reward-overview batching needs evidence of a scaling problem; bookmarks, new game screens or more dashboard panels have no demonstrated demand. Further cosmetic variation would not improve the stated tasks. Stop product iteration and release this coherent wave; retain the verification limitations above.

## Combined verification and release preparation

- Frontend `lint`, `typecheck` and production `build`: passed after the final profile spacing change. Build uses a local test API URL; the host will build its deployment artifact with existing public configuration.
- Shared, web and Twitch TypeScript builds passed. Collector `npm test`: 46 passed. Web `npm test` against a fresh, strictly guarded disposable PostgreSQL: 82 passed, zero skipped. Includes existing integration suites and the new search/calendar tests.
- Full production-browser suite: 34 passed, zero failed (23.1s after profile layout refinement). Following the final biography-padding-only adjustment, all six community scenarios passed again (5.0s), including the enlarged-text screenshot. No test assertions weakened; no rules or checks bypassed.
- Detector output and benchmark samples are committed evidence. Detailed command logs remain local ignored `.log` files. No production records, credentials, generated fixture dataset or build output included.
- Next dev generated untracked AGENTS/CLAUDE files during this task; removed after stopping dev. Test-regenerated historical screenshots restored byte-for-byte from the clean starting revision; current evidence stays in this directory.
- Pre-release fetch: origin/main still `07c708b18f202fb2098422ae52db092fe1f8d70e`. Deployment checkout clean at the same SHA; three services running; 5.9 GiB available. No existing user changes to preserve in either checkout.

Next: stage/review the exact diff, commit, push normally to main, follow the placeholder GitHub workflow, preserve prior image tags, build sequentially on the established host, deploy and verify revision/images/read-only live journeys. Record immutable commit, workflow, image and smoke evidence in local `release-verification.log` and the final report. Follow [local testing](../../../docs/local-testing.md) to reproduce checks and [community rankings](../../../docs/community-rankings.md) for behavior and data definitions.
