# Stream recordings and viewer counts

Apply `backend/shared/prisma/migrations/20260906120000_stream_video_and_viewers/migration.sql` using the project's Prisma migration workflow before starting the updated Twitch collector or Web API. From `backend/shared`, run `npx prisma migrate deploy` against the intended database. Regenerate the Prisma client with `npm run db:generate` for local development; the existing Docker builds already generate it.

The migration adds a nullable `Stream.twitchVideoId` and the `StreamViewerSample` table. It preserves existing stream IDs and history. No Twitch permissions or new dependencies are needed.

The collector looks up published channel archives on its first status check and every five minutes afterwards, including while offline. It follows pagination and matches each archive's `stream_id` to `Stream.twitchId`. This also fills video IDs for existing streams whose archives are still returned by Twitch. Failed responses leave existing matches and availability untouched. A complete successful scan updates availability without erasing saved video IDs. For YouTube fallback, split recordings and synchronized chat replay, see [YouTube recordings](youtube-recordings.md), including its additional migration and configuration.

Stream status is polled once per minute. Successful live responses store the audience count with the observation timestamp. Failed requests and offline responses do not create zero-count samples. Concurrent status checks are skipped. Viewer samples are matched by Twitch stream ID rather than the in-memory active stream.

The activity chart uses peak Twitch audience samples per display interval when samples exist. Intervals without samples remain gaps, and chat presence is never mixed into the audience series. Historical streams without samples retain the labelled tracked-viewer series. Historical Twitch audience counts cannot be backfilled from chat sessions or a video's total view count.

Focused checks:

- `backend/twitch`: `node --require ts-node/register --test tests/streamMetadata.service.test.cjs`
- `backend/web`: `node --test tests/streamActivity.test.cjs`

The activity query also has a PostgreSQL integration regression test. With the disposable localhost database described in `youtube-recordings.md` running and migrated, set `VOD_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55489/postgres` and run `node --test tests/streamActivity.integration.test.cjs` from `backend/web`. It checks UTC, Helsinki, and New York in summer and winter, including hour boundaries, partial intervals, ongoing streams, and preservation of message totals. Each fixture transaction is rolled back. Raw activity queries must treat the database's timezone-less timestamps as UTC; binding JavaScript Dates as `timestamptz` and casting in the session timezone shifts chat into the wrong intervals.
