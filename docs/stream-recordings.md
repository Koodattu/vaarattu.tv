# Stream recordings and viewer counts

Apply `backend/shared/prisma/migrations/20260906120000_stream_video_and_viewers/migration.sql` using the project's Prisma migration workflow before starting the updated Twitch collector or Web API. From `backend/shared`, run `npx prisma migrate deploy` against the intended database. Regenerate the Prisma client with `npm run db:generate` for local development; the existing Docker builds already generate it.

The migration adds a nullable `Stream.twitchVideoId` and the `StreamViewerSample` table. It preserves existing stream IDs and history. No Twitch permissions or new dependencies are needed.

The collector looks up published channel archives on its first status check and every five minutes afterwards, including while offline. It follows pagination and matches each archive's `stream_id` to `Stream.twitchId`. This also fills video IDs for existing streams whose archives are still returned by Twitch. Missing or failed responses leave existing matches untouched. Expired or deleted archives cannot be recovered; Twitch handles playback availability for previously matched videos. An unmatched stream displays a recording-unavailable message instead of embedding its stream ID.

Stream status is polled once per minute. Successful live responses store the audience count with the observation timestamp. Failed requests and offline responses do not create zero-count samples. Concurrent status checks are skipped. Viewer samples are matched by Twitch stream ID rather than the in-memory active stream.

The activity chart uses peak Twitch audience samples per display interval when samples exist. Intervals without samples remain gaps, and chat presence is never mixed into the audience series. Historical streams without samples retain the labelled tracked-viewer series. Historical Twitch audience counts cannot be backfilled from chat sessions or a video's total view count.

Focused checks:

- `backend/twitch`: `node --require ts-node/register --test tests/streamMetadata.service.test.cjs`
- `backend/web`: `node --test tests/streamActivity.test.cjs`
