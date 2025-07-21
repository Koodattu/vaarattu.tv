---
applyTo: "**/**"
---

# Project Plan: vaarattu.tv

Personal streamer website for Twitch.tv/vaarattu

---

## **Goals**

- Track and visualize stream status, chat, events, viewer activity
- Build a platform for public leaderboards, viewer profiles, admin analytics, and unique streamer content (setup, clips, fan wiki)

---

## **Main Features**

1. **Homepage**

   - Stream embed/status
   - Featured clips
   - Quick links: leaderboards, clips, setup, wiki

2. **Leaderboards**

   - Most chat messages
   - Most watchtime (aggregate by sessions)
   - Channel point redemption leaderboards (per reward, per user, total points spent)
   - Most used emotes (all platforms)

3. **Viewer Profiles**

   - Public, wiki-style profiles: left side AI-generated text (updated every 100 messages, based on all previous text), right side stat table (watchtime, message count, sub rank, emote stats, badges, favorite redeem/game/emote, ranks, achievements, etc)
   - Name history tracking
   - Achievements/fan wiki badges
   - Emote usage breakdown
   - Twitch OAuth login (identity only)

4. **Clips**

   - List all past clips (import via Twitch API)
   - Showcase on homepage
   - Search/filter by stream/date/emote/user

5. **Streams**

   - List all past streams (title, start/end, stats)
   - Per-stream timeline: when each user was present
   - Search for stream by date/title

6. **Admin Dashboard**

   - Full message log/search by user/date/stream
   - Per-user timeline (when present in chat)
   - Full session logs/export (CSV)
   - View/update AI summaries

7. **Streamer Setup**

   - Static device list (name, description, images)
   - Future: Interactive 3D model of setup, click for details

8. **Emote Tracking**

   - Track usage of Twitch, FFZ, 7TV, BetterTTV emotes
   - Display global/user stats

9. **Fan Wiki / Custom Achievements**
   - User-contributed badges, facts, streamer lore

---

## **Technical Plan**

### **Frontend**

- Next.js (React, TypeScript, Tailwind)
- Responsive, accessible, mobile-first
- OAuth login via Twitch (NextAuth.js or custom)
- API integration for all dynamic data
- All heavy search/filtering performed server-side

### **Backend**

- Node.js (Express, TypeScript, Prisma ORM)
- PostgreSQL (Dockerized, managed with Prisma)
- Twitch API (IRC for chat, EventSub for events, REST for users/streams/clips)
- Efficient batch processing for chatters/session tracking
- Name history tracking (table updated on name change detection)
- Emote usage parsing and aggregation (all platforms)
- Secure Twitch OAuth (identity only, validate all tokens)

### **Database Essentials**

- `users`: twitch_id, login, display name, avatar, history, last_seen
- `name_history`: user_id, previous_name, changed_at
- `messages`: id, user_id, stream_id, content, timestamp
- `redemptions`: id, user_id, reward_type, points, timestamp, stream_id
- `streams`: id, start_time, end_time, status, title
- `view_sessions`: id, user_id, stream_id, session_start, session_end
- `emote_usage`: id, user_id, emote, platform, count, timestamp, stream_id
- `viewer_profiles`: user_id, ai_summary, stats, achievements, consent, last_update
- `setup_items`: id, name, description, image, model_url (for 3D, future)

---

## **Implementation Steps**

1. **Setup:**
   - GitHub repo, Docker Compose, DB/Prisma schema, CI (lint, typecheck, test)
2. **Stream Basics:**
   - Twitch API integration for stream status, embed, past streams
3. **Chat & Redemptions:**
   - IRC bot, EventSub webhook, log messages/redemptions
4. **Sessions/Presence:**
   - Poll chatters endpoint every 5min, create/update sessions per user/stream
5. **Leaderboards & Stats:**
   - Aggregate messages, watchtime, redeems, emotes; build API endpoints
6. **Viewer Profiles:**
   - Profile pages, AI summaries (update after X messages), table view, achievements
7. **Admin Tools:**
   - Search logs, session viewer, export data, update profiles
8. **Clips & Streams:**
   - Import clips/past streams, create browse/search pages
9. **Streamer Setup:**
   - Static list, images; future: interactive 3D view
10. **Fan Wiki:**

- Custom badge system, user content

11. **Security/Privacy:**

- Explicit consent for AI/analytics, OAuth only for identity, user data handled per privacy best practices

---

## **Best Practices**

- Full TypeScript, strict everywhere
- Never commit secrets/tokens; use `.env` and secrets management
- Document all endpoints (OpenAPI)
- All migrations through Prisma
- All heavy queries are indexed, batched, never N+1
- All input validated, all errors logged
- UI fully accessible, responsive, tested on all major devices
- All analytics/leaderboards generated server-side
- Automated tests (unit + integration) and CI on push
- Explicit user consent for AI/analytics/profile generation

---

## **References**

- [Twitch IRC](https://dev.twitch.tv/docs/irc/)
- [Twitch EventSub](https://dev.twitch.tv/docs/eventsub/)
- [Prisma ORM](https://www.prisma.io/)
- [Next.js Docs](https://nextjs.org/docs/)
- [Twitch OAuth](https://dev.twitch.tv/docs/authentication/)
- [FFZ API](https://api.frankerfacez.com/docs/)
- [7TV API](https://dev.7tv.app/)
- [BetterTTV API](https://betterttv.com/developers/)
