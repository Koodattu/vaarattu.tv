import {
  ApiResponse,
  StreamListItem,
  StreamDetail,
  StreamTimeline,
  LeaderboardSummary,
  LeaderboardUser,
  LeaderboardEmote,
  LeaderboardReward,
  LeaderboardGame,
  RewardUserLeaderboard,
  TimeRange,
  UserListItem,
  UserProfile,
} from "@/types/api";

// Use NEXT_PUBLIC_API_BASE_URL if set, else default to empty string (relative path)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

class ApiClient {
  private async fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      // Always use relative path if API_BASE_URL is empty (prod behind nginx)
      const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Stream endpoints
  async getStreams(page: number = 1, limit: number = 20): Promise<ApiResponse<StreamListItem[]>> {
    return this.fetchApi<StreamListItem[]>(`/api/streams?page=${page}&limit=${limit}`);
  }

  async getStream(streamId: number): Promise<ApiResponse<StreamDetail>> {
    return this.fetchApi<StreamDetail>(`/api/streams/${streamId}`);
  }

  async getStreamTimeline(streamId: number): Promise<ApiResponse<StreamTimeline>> {
    return this.fetchApi<StreamTimeline>(`/api/streams/${streamId}/timeline`);
  }

  // Leaderboard endpoints
  async getLeaderboardSummary(timeRange: TimeRange = "all"): Promise<ApiResponse<LeaderboardSummary>> {
    return this.fetchApi<LeaderboardSummary>(`/api/leaderboards/summary?timeRange=${timeRange}`);
  }

  async getTopUsers(
    sortBy: "messages" | "watchtime" | "points" = "messages",
    timeRange: TimeRange = "all",
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<LeaderboardUser[]>> {
    return this.fetchApi<LeaderboardUser[]>(`/api/leaderboards/users?sortBy=${sortBy}&page=${page}&limit=${limit}&timeRange=${timeRange}`);
  }

  async getTopEmotes(platform?: string, timeRange: TimeRange = "all", page: number = 1, limit: number = 20): Promise<ApiResponse<LeaderboardEmote[]>> {
    let url = `/api/leaderboards/emotes?page=${page}&limit=${limit}&timeRange=${timeRange}`;
    if (platform) url += `&platform=${platform}`;
    return this.fetchApi<LeaderboardEmote[]>(url);
  }

  async getEmotePlatforms(): Promise<ApiResponse<string[]>> {
    return this.fetchApi<string[]>("/api/leaderboards/emotes/platforms");
  }

  async getTopRewards(timeRange: TimeRange = "all", page: number = 1, limit: number = 20): Promise<ApiResponse<LeaderboardReward[]>> {
    return this.fetchApi<LeaderboardReward[]>(`/api/leaderboards/rewards?page=${page}&limit=${limit}&timeRange=${timeRange}`);
  }

  async getRewardLeaderboard(rewardId: string, timeRange: TimeRange = "all", page: number = 1, limit: number = 20): Promise<ApiResponse<RewardUserLeaderboard>> {
    return this.fetchApi<RewardUserLeaderboard>(`/api/leaderboards/rewards/${rewardId}?page=${page}&limit=${limit}&timeRange=${timeRange}`);
  }

  async getAllRewardLeaderboards(timeRange: TimeRange = "all"): Promise<ApiResponse<RewardUserLeaderboard[]>> {
    return this.fetchApi<RewardUserLeaderboard[]>(`/api/leaderboards/rewards/all?timeRange=${timeRange}`);
  }

  async getTopGames(timeRange: TimeRange = "all", page: number = 1, limit: number = 20): Promise<ApiResponse<LeaderboardGame[]>> {
    return this.fetchApi<LeaderboardGame[]>(`/api/leaderboards/games?page=${page}&limit=${limit}&timeRange=${timeRange}`);
  }

  // User/Profile endpoints
  async getUsers(page: number = 1, limit: number = 25, search?: string): Promise<ApiResponse<UserListItem[]>> {
    let url = `/api/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.fetchApi<UserListItem[]>(url);
  }

  async getUserProfile(userId: number): Promise<ApiResponse<UserProfile>> {
    return this.fetchApi<UserProfile>(`/api/users/${userId}`);
  }

  async getUserProfileByLogin(login: string): Promise<ApiResponse<UserProfile>> {
    return this.fetchApi<UserProfile>(`/api/users/login/${encodeURIComponent(login)}`);
  }
}

export const apiClient = new ApiClient();
