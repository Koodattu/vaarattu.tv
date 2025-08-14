# vaarattu.tv Web API

Backend API server for the vaarattu.tv website, providing data endpoints for leaderboards, user profiles, streams, and moderation tools.

## 🚀 Getting Started

### Development

```bash
cd backend/web
npm install
npm run dev
```

### Production

```bash
cd backend/web
npm run build
npm start
```

The server will start on port 3001 (configurable via `WEB_API_PORT` environment variable).

## 📋 API Endpoints

### Health Check

- `GET /health` - Basic health check

### Leaderboards

- `GET /api/leaderboards/emotes` - Top emotes by usage count
- `GET /api/leaderboards/users` - Top users by messages/watchtime/points
  - Query: `sortBy=messages|watchtime|points` (default: messages)
- `GET /api/leaderboards/rewards` - Top channel point rewards by redemptions
- `GET /api/leaderboards/games` - Top games by total watch time

### Users

- `GET /api/users` - List all users with basic info
  - Query: `search=username` (optional)
- `GET /api/users/:id` - Get full user profile by ID
- `GET /api/users/login/:login` - Get full user profile by Twitch login

### Streams

- `GET /api/streams` - List all past streams
- `GET /api/streams/:id/timeline` - Detailed stream timeline with viewer sessions

### Moderation (Future: Auth Required)

- `GET /api/mod/users/:userId/messages` - Get all messages from a specific user
  - Query: `search=text`, `streamId=number` (optional filters)
- `GET /api/mod/messages/search` - Search messages across all users
  - Query: `search=text` (required), `streamId=number`, `userId=number` (optional filters)

## 🔍 Query Parameters

All list endpoints support pagination:

- `page=number` (default: 1)
- `limit=number` (default: 20, max: 100)

## 📊 Response Format

All endpoints return JSON in this format:

```json
{
  "success": boolean,
  "data": any,
  "error?": string,
  "pagination?": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

## 🛠️ Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL via Prisma ORM (shared package)
- **Validation**: Input validation and error handling
- **CORS**: Enabled for frontend integration

## 📁 Project Structure

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic and database queries
├── routes/          # Express route definitions
├── middleware/      # Error handling, validation
├── types/           # TypeScript type definitions
├── utils/           # Helper functions (pagination, etc.)
└── index.ts         # Application entry point
```

## 🔮 Future Features

- Twitch OAuth authentication for user-specific data
- Role-based access control (mod-only endpoints)
- Rate limiting and request validation
- OpenAPI/Swagger documentation
- Caching for frequently accessed data
- Real-time updates via WebSockets

## Example Usage

```bash
# Get top 10 users by message count
curl "http://localhost:3001/api/leaderboards/users?limit=10&sortBy=messages"

# Search for a specific user
curl "http://localhost:3001/api/users?search=username"

# Get user profile
curl "http://localhost:3001/api/users/login/vaarattu"

# Get recent streams
curl "http://localhost:3001/api/streams?limit=5"

# Search messages containing "kappa"
curl "http://localhost:3001/api/mod/messages/search?search=kappa&limit=50"
```
