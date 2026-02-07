# vaarattu.tv 📺

A full-stack Twitch analytics and community engagement platform for [twitch.tv/vaarattu](https://twitch.tv/vaarattu).

Track everything that happens on stream — from chat messages and watchtime to channel point redemptions and emote usage across multiple platforms. Features AI-generated viewer profiles, comprehensive leaderboards, and detailed moderator tools.

## ✨ What Makes This Special

- **🤖 AI-Generated Viewer Profiles**: Satirical Wikipedia-style biographies written in Finnish that update automatically as viewers chat. Each profile is unique, humorous, and captures the viewer's personality based on their chat behavior.

- **😄 Multi-Platform Emote Tracking**: Comprehensive tracking of Twitch, BTTV, FFZ, and 7TV emotes — both per-user and globally. See which emotes dominate your community!

- **📊 Dynamic Leaderboards**: Multiple categories (messages, watchtime, channel points, emotes, rewards, games) with flexible time-range filtering (all-time, yearly, monthly, weekly).

- **🎯 Real-Time Data Collection**: Live tracking of everything happening on stream using Twitch IRC, EventSub, and periodic polling.

- **🔍 Advanced Moderator Tools**: Search through all chat messages, view user histories, and analyze activity patterns with powerful filtering.

## 🎯 Key Features

### For Viewers

- **Personal Profiles**: View your stats, watchtime, favorite emotes, top redeemed rewards, and get your own AI-generated bio
- **Leaderboards**: Compete across multiple categories and see where you rank
- **Stream History**: Browse past streams and VODs
- **Clips Showcase**: Highlight the best moments (planned)

### For Streamers

- **Real-Time Analytics**: Track viewer engagement, chat activity, and channel point usage
- **Community Insights**: Understand which games, emotes, and rewards resonate most
- **Session Tracking**: See exactly when each viewer was present during a stream
- **Comprehensive Logging**: Every message, redemption, and interaction is recorded

### For Moderators

- **Message Search**: Find messages across all streams and users with advanced filtering
- **User History**: Review complete chat history for any viewer
- **Activity Monitoring**: Track patterns and engagement across the community

## 🛠️ Tech Stack

### Frontend

- **Next.js 16** (App Router) with React 19
- **TypeScript** (strict mode)
- **Tailwind CSS v4** for styling
- Embedded Twitch stream and chat

### Backend

Two specialized Node.js services:

1. **Twitch Service**: Real-time data collection
   - Twurple libraries for Twitch API integration
   - OpenAI for AI profile generation
   - Multi-platform emote parsing

2. **Web API Service**: REST API for frontend
   - Express.js 5
   - Clean layered architecture (routes → controllers → services)

### Database

- **PostgreSQL** with Prisma ORM
- 13 models tracking everything from messages to session data
- Comprehensive relationships for analytics

### Deployment

- **Docker Compose** for container orchestration
- Self-hosted on Raspberry Pi 5
- All services containerized with volume mounts

## 📦 Project Structure

```
vaarattu.tv/
├── backend/
│   ├── shared/              # Prisma schema shared across services
│   ├── twitch/              # Real-time Twitch data collection
│   └── web/                 # Public REST API
├── frontend/                # Next.js web application
└── docker-compose.yml       # Container orchestration
```

**Monorepo layout** with clear separation between data collection and API serving.

## 🚀 Current Status

### ✅ Fully Implemented

- Real-time chat and event tracking
- AI-generated viewer profiles (auto-updating)
- Multi-category leaderboards with time filters
- Emote tracking (Twitch, BTTV, FFZ, 7TV)
- Watchtime and session tracking
- Stream timelines showing viewer presence
- Moderator message search tools

### 🚧 In Progress

- Clips system
- Enhanced VOD features
- Game/category tracking polish

### 📋 Planned

- Twitch OAuth login for viewers
- Custom achievements and badges
- Streamer setup showcase page
- Fan wiki functionality
- CSV data exports

## 🎨 Unique Highlights

### AI-Powered Personalities

Using GPT-4o-mini, the system generates humorous, Wikipedia-style profiles that update every 100 messages. These aren't just stats — they're satirical biographies that capture each viewer's unique personality and chat style. Written in Finnish with comedic exaggeration.

### Comprehensive Session Tracking

Every time a viewer joins or leaves chat, it's tracked. This enables precise watchtime calculations and the ability to see exactly when each person was present during a stream.

### Batch Analytics Processing

Instead of calculating stats on every message, analytics are processed efficiently at the end of each stream. This keeps the system fast while still providing detailed insights.

### Self-Hosted Philosophy

Designed to run on a Raspberry Pi 5 — no expensive cloud hosting required. Everything stays under your control.

## 🔧 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Twitch Developer App (Client ID & Secret)
- OpenAI API key (for AI profiles)

### Configuration

1. Set up environment variables in `backend/twitch/.env`:
   - `DATABASE_URL`
   - `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`
   - `OPENAI_API_KEY`
   - `STREAMER_USER_ID` and `BOT_USER_ID`

2. Run database migrations:

   ```bash
   cd backend/shared
   npm run db:migrate
   ```

3. Start services with Docker Compose:

   ```bash
   docker-compose up
   ```

4. On first run, complete the OAuth flow for streamer and bot accounts

### Services

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:3001
- **Twitch Service**: http://localhost:4000 (internal)

## 📊 Data You'll Track

- **Chat Messages**: Every message with full content and metadata
- **Watchtime**: Per-user session tracking with join/leave events
- **Emote Usage**: All platforms (Twitch, BTTV, FFZ, 7TV)
- **Channel Points**: Redemptions and spending patterns
- **Stream Segments**: Game changes and title updates
- **User Profiles**: Badges, sub status, follower status, name history
- **Analytics**: Top emotes, games, and rewards per viewer

## 🤝 Contributing

This is a personal project for the vaarattu Twitch community, but feel free to explore the code and adapt it for your own channel!

## 📄 License

See [LICENSE](LICENSE) for details.

---

Built with ❤️ for the vaarattu community
