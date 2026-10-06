# Community rankings

Open **Leaderboards**, choose a category and period, then use **Find a viewer**
to search by Twitch login or display name. A profile's **View Rankings** link
opens that viewer's name search. Category navigation carries the viewer and
period between messages, watchtime, points, gifted subscriptions and cheers.
Phones use native category and period selectors; larger screens show the choices
directly. Rewards and emotes remain separate lists with their existing details.

Period, search and page are encoded in the URL. Refresh, browser Back, profile
round trips and shared links restore the selection. Changing period or search
resets pagination. Emotes retain their platform/page and always show all-time
usage; a period carried from another category is only return-navigation context.
Reward titles in the overview link directly to that reward's viewer rankings.

## What the numbers mean

- A viewer's `rank` is their position in the **full category and period**, before
  filtering by name. Search results do not become a new first-place leaderboard.
- Equal scores keep a stable viewer-ID order, preserving the existing ordinal
  positions. These are positions, not shared competition ranks.
- All-time messages/watchtime/points use existing generated viewer-profile
  totals, which update after streams. Period rankings aggregate source events.
- Watchtime measures completed chat-presence sessions. Period sessions are
  clipped to the interval; this is not verified video consumption.
- Points use each reward's current cost. Historical prices are not recorded;
  this release does not invent them or change the collection model.
- Gift and cheer totals exclude records without an identified viewer. Their
  event counts remain visible beside subscription/bit totals.
- Emote usage has no timestamp and cannot truthfully support period filtering.

`week` means the preceding seven days. `month` and `year` roll back one calendar
month/year from the current UTC time, retaining the time of day and clamping to
the last valid day of a shorter month. For example, March 31 → February 28/29 and
February 29 → February 28 in the prior year. This fixes the previous JavaScript
date overflow that could make “Past Month” begin in the current month.

## API compatibility

Existing routes, parameters and response fields remain. These endpoints accept
an additional optional `search` parameter, trimmed and limited to 300 characters:

- `/api/leaderboards/users?sortBy=messages|watchtime|points`
- `/api/leaderboards/gifts`
- `/api/leaderboards/cheers`

Matching is case-insensitive literal substring search across login and display
name. Percent signs, underscores and backslashes are literal text, not SQL
patterns. Repeated search values and oversized input return 400. An empty query
means the full leaderboard.

Each returned viewer now also includes numeric `rank`. Pagination totals count
matching viewers, while ranks refer to the full population. An out-of-range page
is empty but retains the correct total. No schema migration or dependency is
required. Rank and name filtering run in PostgreSQL; the API receives one page
plus its count, including for period points rankings.

## Verification

Follow [isolated local testing](local-testing.md). The exact guarded test database
port is now 35489; the old 55489 can fall inside Windows' dynamic excluded-port
range. All checks continue to reject any other database URL.

`backend/web/tests/viewerRankings.integration.test.cjs` covers global positions,
ties, literal search, all five metrics, periods and pagination against PostgreSQL.
`leaderboardRange.test.cjs` covers calendar/leap-year boundaries.
`frontend/tests/community.spec.ts` covers discovery, URL continuity, recovery,
rapid mobile changes, keyboard search, long content and enlarged text.

The [working record](../work/goal-improvement/community/STATE.md) contains the
research, release evidence and reproducible synthetic benchmark. Benchmark rows
roll back; no production records are used.
