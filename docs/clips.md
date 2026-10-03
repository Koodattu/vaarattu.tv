# Twitch clips

`/clips` is the channel's saved clip catalog. Search matches a clip's title, game
or clipper, without interpreting SQL wildcard characters. Most viewed is the
default order; newest first, last 7/30 days, and Twitch-featured clips are optional
filters. Date periods mean creation within that rolling interval, not views
earned during it. Views are Twitch's lifetime counts at the last successful refresh.
Filters and pagination are in the URL and survive refresh and Back to clips.
The home page shows the three most viewed available clips.

Each `/clips/:id` page has a clean share link, metadata, and a Twitch playback
link. A player is loaded only after Play clip. Twitch requires a clip iframe at
least 400×300; smaller containers offer direct Twitch playback. The provider link
and reload control remain available because a cross-origin iframe cannot report
playback availability to this app. An exact stored Twitch video ID can link to the
source stream at the clip's VOD offset. Clips are never matched by guessed titles
or dates. Twitch may omit an offset or remove the source VOD.

## API

- `GET /api/clips?page=1&limit=12&q=caves&sort=popular&period=all&featured=false`
- `GET /api/clips/:id`

The list uses the existing `{ success, data, pagination }` response. Defaults are
page 1, limit 20 (maximum 100), popular, all time, and no featured-only restriction.
Search text is trimmed and capped at 300 characters. Unsupported filters, repeated
values and invalid IDs return 400; unknown clip IDs return 404. The detail endpoint
returns known unavailable clips with `available: false`. Lists omit those clips.
Ordering breaks ties with creation date and clip ID so pages remain deterministic
within a saved snapshot. A background refresh can change rankings between requests.

## Collection and migration

The existing collector imports clip metadata immediately after streamer OAuth is
available, then every 15 minutes. No new token scope, credential or service is
required. It runs independently of chat, EventSub, and stream status collection;
refreshes in the same process never overlap. No media files are downloaded.

Twitch returns view-ranked pages and caps a date window at approximately 1,000
clips. The importer splits windows reaching 900 results, deduplicates clip IDs,
and checks previously saved missing IDs directly before marking them unavailable.
It validates metadata and retrieves game names before writing. Parameterized
upserts in 100-row batches and availability changes publish in one transaction.
Creation and refresh timestamps use UTC explicitly, independent of the database
session timezone. Each successful import also refreshes previously saved timestamps.
Failed remote requests, repeated cursors, malformed metadata or failed database
writes preserve the saved snapshot. Confirmed unavailable records stay stored;
later reappearance restores them to browsing.

Each request has a 20-second deadline; each scan allows at most 500 requests and
five minutes before starting another request. A timed-out SDK request may finish
later, but its result cannot publish data. An exceptionally large catalog or
more than 900 clips in a one-second window fails safely and retries on the next
scheduled refresh. Logs report successful counts or a generic refresh failure
without including SDK request details. There is no production-data verification
in the local test workflow.

Apply `20261003190000_twitch_clips` before starting the updated API and collector,
and regenerate the shared Prisma client. It adds one `Clip` table and indexes
for the two list orders; it does not alter existing tables or backfill external
data in the migration. The first successful collector refresh populates it.
An older application version can run with this additive table still present;
dropping the table would discard the catalog and is not needed for application rollback.

Use [the isolated test workflow](local-testing.md) for real PostgreSQL and browser
verification. Twitch calls are doubled at the SDK boundary; real Twitch playback
and a live channel import require a later authorized deployment check.

Provider references: [Get Clips](https://dev.twitch.tv/docs/api/reference/#get-clips)
and [clip embedding](https://dev.twitch.tv/docs/embed/video-and-clips/#non-interactive-iframes-for-clips).
