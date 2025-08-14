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
