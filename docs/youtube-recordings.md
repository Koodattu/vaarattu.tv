# YouTube recordings and chat replay

The Twitch collector indexes Vaarattu Stream VODs at startup and every six hours. It resolves the exact channel, paginates the entire uploads playlist, and refreshes titles, durations and embedding availability using YouTube Data API v3. It does not download media. Failed or incomplete API scans leave the previous inventory intact. Syncs do not overlap; database locks serialize syncs and manual changes across processes.

## Configuration and rollout

Apply `backend/shared/prisma/migrations/20260906150000_youtube_recordings_and_chat/migration.sql` through the existing Prisma workflow before running the updated backends. From `backend/shared`:

```sh
npx prisma migrate deploy
npm run db:generate
```

The existing Docker Compose migration service runs migrations before starting either backend; Docker builds generate the Prisma client. Deploy the updated frontend and both backends together. In the ignored `backend/.env`:

```dotenv
YT_API_KEY=your_server_side_youtube_data_api_key
YT_CHANNEL=UCUCV40VqBZqt83afjbbICvw
```

Enable YouTube Data API v3 for the key. Never put it in `NEXT_PUBLIC_*` variables. `YT_CHANNEL` accepts an exact ID or handle and defaults to the archive channel ID above. OAuth and new dependencies are not required. Without a key, background syncing stays disabled. Existing recordings and chat remain readable. Docker uses the existing backend `.env` mount.

A key may serve both this project and niilo22, subject to its restrictions and shared Google project quota. A full 776-video scan takes approximately 33 requests: one channel lookup, 16 playlist pages and 16 video-detail batches.

## VOD thumbnails

The VOD grid uses the first available linked YouTube recording's thumbnail, falling back to the saved Twitch thumbnail. The YouTube catalog sync saves the best available thumbnail URL from `snippet.thumbnails`; the Twitch archive sync replaces live preview URLs with 640×360 archive thumbnail URLs. Images load directly from the providers, with a placeholder if a URL is missing or fails to load. Image files are not downloaded or permanently archived.

Apply `backend/shared/prisma/migrations/20260906160000_youtube_thumbnails/migration.sql` through the existing Prisma migration workflow and regenerate the Prisma client before running the updated backends. Existing YouTube rows receive thumbnails on the next successful catalog sync (or `npm run recordings -- sync --catalog-only`); existing Twitch archives receive them on the next archive sync. Thumbnails for expired or deleted recordings may no longer be available.

## Matching and review

Matching compares all recorded segment titles with normalized YouTube titles. It removes URLs and punctuation, preserves Finnish letters and distinguishing numbers, tolerates small spelling/spacing changes, and recognizes `part`, `pt` and `osa` markers. Valid leading `D.M.YYYY` dates are treated as original broadcast dates in Europe/Helsinki. Upload/publication dates are never used.

Automatic matches require similarity of at least 0.88 and a lead of at least 0.10 over competitors in both directions. Short generic undated titles and explicit split uploads remain for manual review. Extra channel uploads stay unassigned. Scores are heuristics, not probabilities: inspect the report before relying on the initial bulk match.

Each video has one stream owner; streams can have several ordered recordings. Automatic assignments are provisional and re-evaluated as titles, competing uploads and availability change. This can release an ambiguous match or link a replacement video. Manual assignments and blocks are preserved. Later scans retry unmatched streams, including old streams whose videos were published recently. Confirm an automatic assignment with `set` to preserve it regardless of future title changes.

From `backend/twitch` (keep the collector stopped if you want to review before its first automatic sync):

```sh
# Refresh inventory without changing assignments; review proposals.
npm run recordings -- sync --catalog-only
npm run recordings -- report
npm run recordings -- report 123

# Refresh inventory and apply unambiguous automatic matches.
npm run recordings -- sync
```

The report lists stored titles, assigned recordings, the five strongest candidates, similarity scores, part markers, competing ownership and automatic eligibility. Reporting is read-only. Use the exact channel ID for offline reporting; a configured handle requires an API lookup.

To manually link a stream, create a UTF-8 JSON file with ordered parts:

```json
[
  { "videoId": "aaaaaaaaaaa", "streamOffsetSeconds": 0 },
  { "videoId": "bbbbbbbbbbb", "streamOffsetSeconds": 43200 }
]
```

Replace the example IDs and offsets. `streamOffsetSeconds` is the original stream position corresponding to **second zero of that YouTube video**. For a video trimmed by 90 seconds at the beginning, use 90. For consecutive unedited splits, use the total preceding duration. Parts must have increasing offsets, must not overlap, and must start before the stored stream end when known. Gaps are allowed. Internal edits need additional timeline mapping and cannot be represented by a single offset.

```sh
npm run recordings -- set 123 parts.json
```

This validates channel membership, playback availability, ownership and offsets, then saves atomically and locks the stream against automatic changes. Submit a new file to correct parts. Submit `[]` to remove all parts: the stream stays locked, and removed videos remain blocked from automatic reassignment. Explicit `set` commands can assign blocked videos. To move a video, first remove it from its previous stream's parts file.

In Docker, use the compiled CLI from `/app`:

```sh
docker compose exec backend-twitch node twitch/dist/recordings.js report
docker compose exec backend-twitch node twitch/dist/recordings.js sync
docker compose cp parts.json backend-twitch:/tmp/parts.json
docker compose exec backend-twitch node twitch/dist/recordings.js set 123 /tmp/parts.json
```

Manual correction is a server-side operation. There are no new public write endpoints or authentication changes.

## Playback and chat

The watch page prefers an available Twitch archive. Complete Twitch scans update availability without erasing its ID; failed API calls do not change availability. When a check is missing or over a day old, the expected 60-day retention period supplies the fallback decision. YouTube takes over when Twitch is unavailable. Viewers can also select YouTube while Twitch remains available.

The selected part's offset is added to the player's playback clock. Chat follows both players through pauses, buffering, playback-speed changes and seeking. Consecutive available YouTube parts advance at video end; browser autoplay restrictions may require a viewer gesture. Deleted, private or embedding-disabled YouTube videos are excluded after a complete scan. Regional/account restrictions can still produce player errors; an external recording link remains available.

`GET /api/streams/:id/chat?start=30` returns `[30, 60)` seconds from stream start. Responses contain up to 500 messages and a `nextCursor` to pass as `after`. Ordering by timestamp and message ID preserves ties without lost messages. The `(streamId, timestamp, id)` index supports these queries. The frontend caches nearby windows and displays the latest 200 messages at or before the playback position.

Replay uses saved message text and current display names. Historical badge/emote appearance was not stored per message and is not reconstructed. Streams predating collection, collection outages and unsaved messages cannot be backfilled from the video. Existing timestamps reflect processing time; new timestamps are captured before asynchronous user lookups. Viewers can adjust chat timing by up to 300 seconds. Title-only stream changes now create segments to preserve future matching candidates.

## Verification

```sh
# backend/twitch
node --require ts-node/register --test tests/streamMetadata.service.test.cjs tests/youtubeMatching.test.cjs tests/youtube.service.test.cjs tests/streamTitleHistory.test.cjs
npm run build

# backend/web
node --test tests/chatReplay.test.cjs tests/streamActivity.test.cjs
npm run build

# frontend
npx tsc --noEmit
npm run build
```

The opt-in integration suite only accepts `VOD_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55489/postgres`. Start a disposable PostgreSQL instance bound to localhost port 55489, apply all migrations to it, build `backend/twitch`, set that variable, then run from `backend/web`:

```sh
node --test tests/recordings.integration.test.cjs
```

The suite deletes synthetic data between runs. Never use project data in that database. It exercises actual database constraints, inventory refresh/idempotency, replacement matches, manual ownership/offsets, API playback selection, tied-message pagination, HTTP validation, and removal/reappearance behavior.
