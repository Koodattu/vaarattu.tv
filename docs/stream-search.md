# VOD title search

`GET /api/streams/search?q=9.7.2026%20pushing%2040&youtubeId=OJ-bDXbfEos&limit=10`

Supply a title (`q`, 2–300 characters), a YouTube ID, or both. Limit is 1–10, default 10. An ID with no title also looks up the indexed YouTube title. This is a public read-only metadata endpoint, registered before `/:id`. It changes no recording associations and exposes no chat messages or user information.

The success envelope contains `data: {query, suggestedStreamId, matches}`. Each match includes `id`, start/end time, duration seconds, segment `titles`, `similarity`, `identity`, `reason`, `streamOffsetSeconds`, `recordingDurationSeconds`, `mappingSource`, and `alignment`.

An existing YouTube association wins even if its title changed. Its saved offset is the stream position at YouTube second zero, including split recordings. Identity is `linked`, alignment is `saved`; a saved association is not a new measurement of timing accuracy.

Otherwise the endpoint reuses the collector's matching implementation from the shared package. It compares all segment titles and linked recording titles, preserving Finnish letters and distinguishing numbers, stripping promotional URLs, and recognizing original recording dates in Europe/Helsinki. It tolerates spelling changes. Candidates need similarity >=0.45. A suggested identity needs >=0.88 and a >=0.10 lead; generic undated titles and explicit split titles stay manual. Similarity is a heuristic, not a probability. Fuzzy matches have no timing offset. Duplicate/restarted streams remain separate candidates. Upload dates never substitute for recording dates.

The process shares a 60-second metadata snapshot and coalesces concurrent refreshes. It reads stream/segment/recording metadata only, without message-count queries or database extensions. Invalid queries return 400 through the existing envelope; service errors use the existing error handler.

Deploy the updated Web backend with its shared package to expose this route. The Twitch collector re-exports the same moved matcher; matching behavior is unchanged. No database migration, dependency installation, authentication change, or association backfill is required. This change has not been deployed by the clipper task.

Verification:

```sh
# backend/web
node --test tests/streamSearch.test.cjs tests/streamThumbnails.test.cjs
npm run build
# backend/twitch
node --require ts-node/register --test tests/youtubeMatching.test.cjs
npm run build
# backend/shared
npm run build
```
