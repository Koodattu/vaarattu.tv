---
applyTo: "**/backend/**"
---

# Backend Best Practices

## Stack

- Node.js (TypeScript)
- Express.js (or Next.js API routes if co-located)
- Prisma ORM (PostgreSQL)
- Twitch API (IRC, EventSub, Helix REST)
- Dockerized deployment

## Folder Structure

/src
/api
/controllers
/services
/middlewares
/types
/db

## Practices

- **Strict TypeScript**: No `any`, always type APIs and DB models; types shared with frontend where possible
- **Environment config**: All secrets/tokens via `.env`
- **API design**: RESTful, versioned routes; all endpoints OpenAPI/Swagger documented
- **Database**:
  - Use Prisma ORM, migrations for all schema changes
  - All queries parameterized
  - Efficient batch updates for chatters and user presence (never one user/query at a time)
  - Name history: update on username change, store history table
- **Twitch integration**:
  - Use official Twitch API clients
  - IRC for messages/presence, EventSub for redemptions/events
  - Auth bot login via backend callback page
  - Poll chatters endpoint every 5 minutes for presence/session tracking
- **Watchtime/session tracking**:
  - When user detected in chat, start session (per stream)
  - End session when not present in next poll
  - Store start/stop time, support multiple sessions per user/stream
- **Emote usage tracking**:
  - Parse all chat messages for emote usage
  - Track regular, FFZ, 7TV, BetterTTV emotes globally and per user
- **User table**:
  - Store Twitch ID, username, login, avatar, name history, last seen, etc.
  - Fetch and update info on first activity and periodically per stream
- **Redemptions**:
  - Track all channel point redemptions, store user, reward, points, timestamp
- **Messages**:
  - Log all chat messages, store user, message, timestamp, stream id
- **Streams table**:
  - Store start/end datetimes, detect via Twitch EventSub or polling
- **Viewer profiles**:
  - Generate/update AI summaries every 100 messages, store previous versions
  - Store wiki text, stats, achievements, consent for AI
- **Auth**:
  - OAuth with Twitch for identity only
  - No excessive scopes; do not store unnecessary user data
- **Error handling**:
  - All endpoints wrapped with try/catch
  - Return proper status codes, log errors
- **Logging**: Use Pino/Winston, structured logs, log Twitch API errors
- **Testing**: Jest/Supertest for all API logic and integration, CI runs all tests
- **Security**: Sanitize all input, rate limit endpoints, keep dependencies updated

---

## Database Tables (Essentials)

- `users` (twitch_id, login, name, avatar, history)
- `messages` (id, user_id, content, timestamp, stream_id)
- `redemptions` (id, user_id, reward, points, timestamp, stream_id)
- `streams` (id, start_time, end_time, status, title)
- `viewer_profiles` (user_id, ai_summary, stats, consent, achievements)
- `emote_usage` (id, user_id, emote, count, timestamp, stream_id)
- `view_sessions` (id, user_id, stream_id, session_start, session_end)
- `name_history` (user_id, previous_name, changed_at)

---
