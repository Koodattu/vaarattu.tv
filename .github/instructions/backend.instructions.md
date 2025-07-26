---
applyTo: "**/backend/**"
---

# Backend Best Practices & Structure

## Stack

- Node.js (TypeScript)
- Express.js (or Next.js API routes if co-located)
- Prisma ORM (PostgreSQL)
- Twitch API (IRC, EventSub, Helix REST)
- Dockerized deployment

## Folder & File Responsibilities

For each main folder, define:

- Purpose and allowed contents
- File naming conventions
- What code is allowed/prohibited

### Example Folders:

- `/src/api`: Route definitions, request/response validation, no business logic
- `/src/controllers`: Request handling, orchestrates services, contains try/catch, error handling, logging
- `/src/services`: Business logic, calls to database and external APIs, no HTTP layer code
- `/src/db`: Prisma client, database access functions only, no business logic
- `/src/middlewares`: Express middlewares (auth, validation, error handling)
- `/src/types`: TypeScript types/interfaces, shared types
- `/src/utils`: Pure utility functions, helpers, no side effects

## Explicit Layer Responsibilities

- **API (Routes):**
  - Only define endpoints and attach middlewares/controllers
  - No business logic or DB access
  - Validate and sanitize input (Zod/Yup)
- **Controllers:**
  - Handle HTTP requests, call services
  - Always use try/catch, handle errors, log as needed
  - Never access DB directly
- **Services:**
  - Contain business logic
  - Call DB functions (from `/db`) and external APIs
  - No HTTP/Express code
- **DB Layer:**
  - Only Prisma queries and data access
  - No business logic, no try/catch (let errors bubble up)
- **Middlewares:**
  - Auth, validation, error handling, logging
- **Types:**
  - All shared and exported types/interfaces
- **Utils:**
  - Pure functions, helpers, no dependencies on other layers

## Pragmatic Splitting & Simplicity

- **Do not over-split:**
  - If a feature is small, you may combine controller and service, or service and db, as long as it remains clear and consistent.
  - Only split into multiple files when code grows large, logic is complex, or you need to test in isolation.
  - Avoid empty folders or files "just in case"—split only when needed.
- **Naming:**
  - Use clear, feature-based naming (e.g., `user.controller.ts`, `user.service.ts`).
  - If a feature is trivial, just `user.ts` is fine.
- **Testing:**
  - Keep tests close to the code they test (e.g., a `__tests__` folder inside each main folder, or a global `/tests` folder—pick one and be consistent).

## Sample Directory Tree

```
backend/
  src/
    api/
      v1/
        user.routes.ts
        stream.routes.ts
    controllers/
      user.controller.ts
      stream.controller.ts
    services/
      user.service.ts
      stream.service.ts
    db/
      prisma.ts
      user.db.ts
      stream.db.ts
    middlewares/
      auth.middleware.ts
      error.middleware.ts
      validate.middleware.ts
    types/
      user.types.ts
      stream.types.ts
      index.d.ts
    utils/
      date.utils.ts
      twitch.utils.ts
    tests/
      user.controller.test.ts
      user.service.test.ts
      user.db.test.ts
    index.ts
  prisma/
    schema.prisma
  package.json
  tsconfig.json
```

## Code Placement Examples

- **api/**:
  - `router.post('/users', validateUser, userController.createUser)`
- **controllers/**:
  - `async function createUser(req, res) { try { ... } catch (e) { ... } }`
- **services/**:
  - `async function createUser(data) { ... return db.createUser(data); }`
- **db/**:
  - `export async function createUser(data) { return prisma.user.create({ data }); }`
- **middlewares/**:
  - `function validateUser(req, res, next) { ... }`
- **types/**:
  - `export interface User { ... }`
- **utils/**:
  - `export function formatDate(date: Date): string { ... }`

## Shared Types and Utilities

- All shared types/interfaces go in `/types`
- Utility functions in `/utils`, must be pure and stateless

## Testing Structure

- All test files in `/tests`
- Use `.test.ts` suffix
- Unit tests for services, db, utils
- Integration tests for controllers and API routes

## Summary Table

| Folder       | Contents/Responsibilities                               | Allowed Code            | Prohibited Code             |
| ------------ | ------------------------------------------------------- | ----------------------- | --------------------------- |
| api/         | Route definitions, attach middlewares/controllers       | Routing, validation     | Business logic, DB access   |
| controllers/ | Request handling, call services, error handling/logging | try/catch, logging      | DB access, business logic   |
| services/    | Business logic, call db/external APIs                   | Logic, call db/services | HTTP/Express code           |
| db/          | Prisma client, DB access functions                      | Prisma queries          | Business logic, try/catch   |
| middlewares/ | Express middlewares (auth, validation, error)           | Middleware functions    | Business logic, DB access   |
| types/       | TypeScript types/interfaces                             | Types, interfaces       | Implementation code         |
| utils/       | Pure utility/helper functions                           | Pure functions          | Side effects, stateful code |
| tests/       | Unit/integration tests                                  | Test code               | Production code             |

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
  - All endpoints wrapped with try/catch (in controllers)
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
