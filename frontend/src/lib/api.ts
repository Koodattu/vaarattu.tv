import { ApiResponse, StreamListItem, StreamTimeline } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private async fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);

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

  async getStreams(page: number = 1, limit: number = 20): Promise<ApiResponse<StreamListItem[]>> {
    return this.fetchApi<StreamListItem[]>(`/api/streams?page=${page}&limit=${limit}`);
  }

  async getStreamTimeline(streamId: number): Promise<ApiResponse<StreamTimeline>> {
    return this.fetchApi<StreamTimeline>(`/api/streams/${streamId}/timeline`);
  }
}

export const apiClient = new ApiClient();
