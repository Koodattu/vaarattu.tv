# Collector startup and optional services

Stream status polling starts as soon as the database is connected and streamer tokens are present. EventSub and the bot connection start independently. A bot connection failure or missing bot tokens does not prevent streamer collection; an EventSub startup failure leaves stream status polling running, but EventSub events such as chat messages are unavailable until EventSub is restored.

YouTube sync, the OpenAI connection check, channel rewards, badges, and emote refreshes run in the background. Their failures are logged independently. A slow or failed refresh does not delay startup or saving and activating a stream. Refreshes of the same service do not overlap. Channel metadata refreshes are attempted at startup and on stream start; YouTube retries on its existing six-hour schedule. OpenAI is initialized only when used, so omitting its key cannot crash module loading.

Streamer authentication and a working database are still required for collection. Missing streamer tokens produce an explicit blocked-collection message with the expected path. OAuth completion resumes available services and closes only that account's OAuth server; it does not terminate the collector. If the configured OAuth port is occupied, the error is logged without stopping other collection services.

## Docker token regression

The Docker build optimization in commit `827b05a` stopped copying token files into the image. The old copy had masked a path mismatch: Compose mounted tokens under `/app`, while the compiled auth provider reads and refreshes them under `/app/twitch`.

Compose now mounts the existing host files at `/app/twitch/tokens.streamer.json` and `/app/twitch/tokens.bot.json`. Tokens remain outside the image. Rebuild and recreate the Twitch service after applying this change:

```sh
docker compose build backend-twitch
docker compose up -d --no-build backend-twitch
docker compose logs --tail=100 backend-twitch
```

Confirm the logs show stream status polling and EventSub starting. If tokens are still reported missing or invalid, verify the two host paths under `backend/twitch` are valid token files. Do not print their contents. An HTTP 403 from YouTube is separate from Twitch authentication and does not stop collection.

These changes prevent the identified startup and stream-start dependencies from blocking collection. They do not reconstruct streams or chat messages that were never saved during an outage.

## Regression checks

From `backend/twitch`:

```sh
node --require ts-node/register --test tests/startup.test.cjs tests/authRuntime.test.cjs tests/streamCollection.test.cjs tests/youtube.service.test.cjs tests/openai.service.test.cjs tests/streamTitleHistory.test.cjs
npm run build
```

Tests exercise rejected and stalled optional services, saved stream activation, missing bot tokens, OAuth resumption without process exit, Compose mount destinations against the production auth-provider layout, and YouTube recovery after HTTP 403/500 and timeout failures. They use synthetic credentials and mocked external services, without contacting Twitch, YouTube, OpenAI, or a live database.
