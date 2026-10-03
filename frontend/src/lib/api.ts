import {
  ApiResponse,
  ChatReplayPage,
  StreamListItem,
  StreamDetail,
  StreamActivity,
  StreamTimeline,
  LeaderboardSummary,
  LeaderboardUser,
  LeaderboardEmote,
  LeaderboardReward,
  LeaderboardSubscriptionGift,
  LeaderboardCheer,
  LeaderboardGame,
  RewardUserLeaderboard,
  TimeRange,
  UserListItem,
  UserProfile,
  UserMessage,
  UserViewSession,
} from "@/types/api";

// Use NEXT_PUBLIC_API_BASE_URL if set, else default to empty string (relative path)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

class ApiClient {
  private async fetchApi<T>(endpoint: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
    try {
      // Always use relative path if API_BASE_URL is empty (prod behind nginx)
      const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
      const timeout = AbortSignal.timeout(15000);
      const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });

      if (!response.ok) {
        return { success: false, error: response.status === 404 ? "The requested item was not found." : response.status >= 500 ? "The service is temporarily unavailable. Please try again." : "The request could not be completed. Check your input and try again." };
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof DOMException && error.name === "TimeoutError"
          ? "The request took too long. Please try again."
          : "Unable to connect. Check your connection and try again.",
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

  async getStreamActivity(streamId: number): Promise<ApiResponse<StreamActivity>> {
    return this.fetchApi<StreamActivity>(`/api/streams/${streamId}/activity`);
  }

  async getChatReplay(streamId: number, start: number, after?: string): Promise<ApiResponse<ChatReplayPage>> {
    return this.fetchApi<ChatReplayPage>(`/api/streams/${streamId}/chat?start=${start}${after ? `&after=${encodeURIComponent(after)}` : ""}`);
  }

  async getStreamTimeline(streamId: number): Promise<ApiResponse<StreamTimeline>> {
    return this.fetchApi<StreamTimeline>(`/api/streams/${streamId}/timeline`);
  }

  // Leaderboard endpoints
  async getLeaderboardSummary(timeRange: TimeRange = "all", signal?: AbortSignal): Promise<ApiResponse<LeaderboardSummary>> {
    return this.fetchApi<LeaderboardSummary>(`/api/leaderboards/summary?timeRange=${timeRange}`, signal);
  }

  async getTopUsers(
    sortBy: "messages" | "watchtime" | "points" = "messages",
    timeRange: TimeRange = "all",
    page: number = 1,
    limit: number = 20,
    signal?: AbortSignal,
  ): Promise<ApiResponse<LeaderboardUser[]>> {
    return this.fetchApi<LeaderboardUser[]>(`/api/leaderboards/users?sortBy=${sortBy}&page=${page}&limit=${limit}&timeRange=${timeRange}`, signal);
  }

  async getTopEmotes(platform?: string, timeRange: TimeRange = "all", page: number = 1, limit: number = 20, signal?: AbortSignal): Promise<ApiResponse<LeaderboardEmote[]>> {
    let url = `/api/leaderboards/emotes?page=${page}&limit=${limit}&timeRange=${timeRange}`;
    if (platform) url += `&platform=${encodeURIComponent(platform)}`;
    return this.fetchApi<LeaderboardEmote[]>(url, signal);
  }

  async getEmotePlatforms(): Promise<ApiResponse<string[]>> {
    return this.fetchApi<string[]>("/api/leaderboards/emotes/platforms");
  }

  async getTopRewards(timeRange: TimeRange = "all", page: number = 1, limit: number = 20, signal?: AbortSignal): Promise<ApiResponse<LeaderboardReward[]>> {
    return this.fetchApi<LeaderboardReward[]>(`/api/leaderboards/rewards?page=${page}&limit=${limit}&timeRange=${timeRange}`, signal);
  }

  async getTopGiftedSubs(timeRange: TimeRange = "all", page: number = 1, limit: number = 20, signal?: AbortSignal): Promise<ApiResponse<LeaderboardSubscriptionGift[]>> {
    return this.fetchApi<LeaderboardSubscriptionGift[]>(`/api/leaderboards/gifts?page=${page}&limit=${limit}&timeRange=${timeRange}`, signal);
  }

  async getTopCheers(timeRange: TimeRange = "all", page: number = 1, limit: number = 20, signal?: AbortSignal): Promise<ApiResponse<LeaderboardCheer[]>> {
    return this.fetchApi<LeaderboardCheer[]>(`/api/leaderboards/cheers?page=${page}&limit=${limit}&timeRange=${timeRange}`, signal);
  }

  async getRewardLeaderboard(rewardId: string, timeRange: TimeRange = "all", page: number = 1, limit: number = 20, signal?: AbortSignal): Promise<ApiResponse<RewardUserLeaderboard>> {
    return this.fetchApi<RewardUserLeaderboard>(`/api/leaderboards/rewards/${encodeURIComponent(rewardId)}?page=${page}&limit=${limit}&timeRange=${timeRange}`, signal);
  }

  async getAllRewardLeaderboards(timeRange: TimeRange = "all", signal?: AbortSignal): Promise<ApiResponse<RewardUserLeaderboard[]>> {
    return this.fetchApi<RewardUserLeaderboard[]>(`/api/leaderboards/rewards/all?timeRange=${timeRange}`, signal);
  }

  async getTopGames(timeRange: TimeRange = "all", page: number = 1, limit: number = 20): Promise<ApiResponse<LeaderboardGame[]>> {
    return this.fetchApi<LeaderboardGame[]>(`/api/leaderboards/games?page=${page}&limit=${limit}&timeRange=${timeRange}`);
  }

  // User/Profile endpoints
  async getRandomUsers(limit: number = 18, signal?: AbortSignal): Promise<ApiResponse<UserListItem[]>> {
    return this.fetchApi<UserListItem[]>(`/api/users/random?limit=${limit}`, signal);
  }

  async getUsers(page: number = 1, limit: number = 25, search?: string, signal?: AbortSignal): Promise<ApiResponse<UserListItem[]>> {
    let url = `/api/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.fetchApi<UserListItem[]>(url, signal);
  }

  async getUserProfile(userId: number): Promise<ApiResponse<UserProfile>> {
    return this.fetchApi<UserProfile>(`/api/users/${userId}`);
  }

  async getUserProfileByLogin(login: string, signal?: AbortSignal): Promise<ApiResponse<UserProfile>> {
    return this.fetchApi<UserProfile>(`/api/users/login/${encodeURIComponent(login)}`, signal);
  }

  async getUserViewSessions(userId: number): Promise<ApiResponse<UserViewSession[]>> {
    return this.fetchApi<UserViewSession[]>(`/api/users/${userId}/sessions`);
  }

  async getUserMessages(userId: number, page: number = 1, limit: number = 100, search?: string, signal?: AbortSignal): Promise<ApiResponse<UserMessage[]>> {
    let url = `/api/mod/users/${userId}/messages?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.fetchApi<UserMessage[]>(url, signal);
  }
}

export const apiClient = new ApiClient();
