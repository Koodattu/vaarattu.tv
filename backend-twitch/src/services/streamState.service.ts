import { startChatPollingService, stopChatPollingService } from "../twitch/api/chatPollingService";
import { endAllActiveViewSessions } from "./viewSession.service";

/**
 * Centralized stream state manager for high-performance stream-aware processing.
 * Keeps the current active stream state in memory to avoid database queries
 * for every chat message, redemption, and viewer session event.
 */
class StreamStateManager {
  private currentStreamId: number | null = null;
  private isStreamActive: boolean = false;

  /**
   * Start tracking a new stream session
   */
  async startStream(streamId: number): Promise<void> {
    console.log(`[StreamState] Starting stream tracking for streamId: ${streamId}`);

    this.currentStreamId = streamId;
    this.isStreamActive = true;

    // Start polling chatters now that stream is active
    startChatPollingService();

    console.log(`[StreamState] Stream ${streamId} is now active`);
  }

  /**
   * End the current stream session
   */
  async endStream(): Promise<void> {
    if (!this.isStreamActive) {
      console.warn(`[StreamState] Attempted to end stream but no stream is active`);
      return;
    }

    console.log(`[StreamState] Ending stream tracking for streamId: ${this.currentStreamId}`);

    // End all active view sessions
    await endAllActiveViewSessions();

    // Stop polling chatters
    stopChatPollingService();

    this.currentStreamId = null;
    this.isStreamActive = false;

    console.log(`[StreamState] Stream ended and all sessions closed`);
  }

  /**
   * Get the current active stream ID
   * Returns null if no stream is currently active
   */
  getCurrentStreamId(): number | null {
    return this.isStreamActive ? this.currentStreamId : null;
  }
}

// Export singleton instance
export const streamState = new StreamStateManager();
