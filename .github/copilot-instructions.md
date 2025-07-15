# github-copilot-instructions.md

## Project: vaarattu.tv

Personal streamer website for [Twitch.tv/vaarattu] - Fullstack app for tracking and visualizing the stream, chat, events, viewers, and more.

**Tech stack:**

- Frontend: Next.js (React, TypeScript, Tailwind)
- Backend: Node.js (Express, TypeScript, Prisma)
- Database: PostgreSQL
- Deployment: Docker Compose (Raspberry Pi 5/self-hosted)

## Features (Full Project Scope)

- Main page: show embedded stream, status, clip showcase
- Leaderboards: chat messages, watchtime, channel point redemptions (overall, per reward), channel points spent
- Viewer profiles:
  - Public profile pages with AI-generated Wikipedia-style text (auto-updates per X messages)
  - Table view: watchtime, chat stats, sub rank, emote usage, badges, favorite games/redeems/emotes, etc.
  - Viewer name history, login via Twitch OAuth (identity only)
- Admin dashboard:
  - Full message logs and search
  - Per-stream timeline, when each user was present
  - See/track all viewing sessions
  - Search redeems, users, messages
  - Export data (CSV)
- List all past streams
- List and showcase clips
- Most used emotes, including FrankerFaceZ, 7TV, BetterTTV, standard Twitch emotes
- Custom achievements (for profiles, future/fan wiki)
- Track emote usage globally and per user
- /setup page: list all devices, long-term plan for 3D setup view (click models for details)
- Search across users, redeems, emotes, streams, clips

## General Best Software Practices

- **Full TypeScript, strict mode, shared types between frontend/backend**
- **Environment variables for all secrets** (`.env`), never commit real tokens/keys
- **Validation:** Use Zod/Yup for all API payloads and user input
- **Error handling:** All endpoints wrapped in try/catch, log errors, return user-friendly messages
- **Testing:** Unit and integration tests (Jest, React Testing Library, Supertest)
- **CI/CD:** Run linter, typecheck, and all tests on push (GitHub Actions)
- **Documentation:** JSDoc for exported functions, keep all README files current
- **Atomic commits, meaningful messages, feature branches**
- **Accessibility:** a11y checked for all user-facing pages
- **Security:** Sanitize user input, rate-limit sensitive endpoints, always validate OAuth tokens
- **OpenAPI/Swagger:** Document backend endpoints
- **DB migrations tracked via Prisma**
- **Dockerized deployments; Docker Compose for self-hosted setup**
- **All analytics/leaderboards calculated server-side**
- **Explicit user consent for AI/analytics/profile generation**

## Twitch Integration

- Use Twitch API (IRC, EventSub, Helix REST)
- Track: messages, chatters (presence), redemptions, emote usage, stream events
- Use Twitch OAuth for login (identity only, no unnecessary scopes)
- Bot login/auth callback managed by backend

---
