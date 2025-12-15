// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Stream types
export interface StreamListItem {
  id: number;
  twitchId: string;
  startTime: string; // ISO date string
  endTime: string | null;
  duration: number | null; // minutes
  thumbnailUrl: string | null;
  totalMessages: number;
  totalRedemptions: number;
  uniqueViewers: number;
  segments: Array<{
    title: string;
    gameName: string;
    startTime: string;
    endTime: string | null;
    duration: number | null;
  }>;
}

// Single stream detail (for VOD page)
export interface StreamDetail {
  id: number;
  twitchId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  totalMessages: number;
  totalRedemptions: number;
  uniqueViewers: number;
  segments: Array<{
    id: number;
    title: string;
    gameName: string;
    gameBoxArtUrl: string | null;
    startTime: string;
    endTime: string | null;
    duration: number | null;
  }>;
}

export interface StreamTimeline {
  id: number;
  twitchId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  segments: Array<{
    id: number;
    title: string;
    gameName: string;
    gameBoxArtUrl: string | null;
    startTime: string;
    endTime: string | null;
    duration: number | null;
  }>;
  viewerSessions: Array<{
    userId: number;
    userLogin: string;
    userDisplayName: string;
    sessionStart: string;
    sessionEnd: string | null;
    duration: number | null;
  }>;
  stats: {
    totalMessages: number;
    totalRedemptions: number;
    uniqueViewers: number;
    peakViewers: number;
  };
}

// Leaderboard types
export type TimeRange = "all" | "year" | "month" | "week";

export interface LeaderboardUser {
  id: number;
  twitchId: string;
  login: string;
  displayName: string;
  avatar: string | null;
  totalMessages: number;
  totalWatchTime: number;
  totalPointsSpent: number;
  totalRedemptions: number;
}

export interface LeaderboardEmote {
  id: number;
  name: string;
  platform: string;
  imageUrl: string | null;
  totalUsage: number;
}

export interface LeaderboardReward {
  id: number;
  twitchId: string;
  title: string;
  cost: number;
  imageUrl: string | null;
  totalRedemptions: number;
  totalPointsSpent: number;
}

export interface LeaderboardGame {
  id: number;
  twitchId: string;
  name: string;
  boxArtUrl: string | null;
  totalWatchTime: number;
  totalStreams: number;
}

export interface RewardUserLeaderboard {
  reward: {
    id: number;
    twitchId: string;
    title: string;
    cost: number;
    imageUrl: string | null;
  };
  users: Array<{
    id: number;
    twitchId: string;
    login: string;
    displayName: string;
    avatar: string | null;
    redemptionCount: number;
    totalPointsSpent: number;
  }>;
  total: number;
}

export interface LeaderboardSummary {
  topWatchtime: LeaderboardUser[];
  topMessages: LeaderboardUser[];
  topPointsSpent: LeaderboardUser[];
  topEmotes: LeaderboardEmote[];
  topRewards: LeaderboardReward[];
}

// User types
export interface UserListItem {
  id: number;
  twitchId: string;
  login: string;
  displayName: string;
  avatar: string | null;
  totalMessages: number;
  totalWatchTime: number;
  lastSeen: string | null;
  isFollowing?: boolean;
  isSubscribed?: boolean;
  isModerator?: boolean;
  isVip?: boolean;
}

export interface UserProfile extends UserListItem {
  aiSummary: string | null;
  aiSummaryLastUpdate: string | null;
  totalRedemptions: number;
  totalPointsSpent: number;
  averageSessionTime: number;
  topEmotes: Array<{
    name: string;
    platform: string;
    imageUrl: string | null;
    usageCount: number;
    rank: number;
  }>;
  topGames: Array<{
    name: string;
    boxArtUrl: string | null;
    watchTime: number;
    rank: number;
  }>;
  topRewards: Array<{
    title: string;
    cost: number;
    imageUrl: string | null;
    redemptionCount: number;
    totalPointsSpent: number;
    rank: number;
  }>;
  nameHistory: Array<{
    previousName: string;
    detectedAt: string;
  }>;
}
