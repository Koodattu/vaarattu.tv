import { ApiResponse, StreamListItem, StreamTimeline } from "@/types/api";

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

  async getStreams(page: number = 1, limit: number = 20): Promise<ApiResponse<StreamListItem[]>> {
    return this.fetchApi<StreamListItem[]>(`/api/streams?page=${page}&limit=${limit}`);
  }

  async getStreamTimeline(streamId: number): Promise<ApiResponse<StreamTimeline>> {
    return this.fetchApi<StreamTimeline>(`/api/streams/${streamId}/timeline`);
  }
}

export const apiClient = new ApiClient();
