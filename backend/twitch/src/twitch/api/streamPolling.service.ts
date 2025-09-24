import prisma from "../../prismaClient";
import { getStreamByUserId } from "./twitchApi";
import { getUserId } from "../auth/authProviders";
import { processStreamOnlineEvent, processStreamOfflineEvent } from "../../services/stream.service";
import { streamState } from "../../services/streamState.service";

interface StreamPollingState {
  isPolling: boolean;
  intervalId: NodeJS.Timeout | null;
  lastKnownStatus: "online" | "offline" | null;
}

const pollingState: StreamPollingState = {
  isPolling: false,
  intervalId: null,
  lastKnownStatus: null,
};

/**
 * Starts the periodic stream status polling service
 * Checks every 5 minutes (300,000ms) for stream status changes
 */
export function startStreamStatusPolling(): void {
  if (pollingState.isPolling) {
    console.warn("[StreamPolling] Service is already running");
    return;
  }

  console.log("[StreamPolling] Starting periodic stream status checking (every 5 minutes)");

  // Initial check
  checkStreamStatus();

  // Set up periodic checks
  pollingState.intervalId = setInterval(checkStreamStatus, 5 * 60 * 1000); // 5 minutes
  pollingState.isPolling = true;
}

/**
 * Stops the periodic stream status polling service
 */
export function stopStreamStatusPolling(): void {
  if (!pollingState.isPolling) {
    console.warn("[StreamPolling] Service is not running");
    return;
  }

  console.log("[StreamPolling] Stopping periodic stream status checking");

  if (pollingState.intervalId) {
    clearInterval(pollingState.intervalId);
    pollingState.intervalId = null;
  }

  pollingState.isPolling = false;
  pollingState.lastKnownStatus = null;
}

/**
 * Manually trigger a stream status check
 */
export async function checkStreamStatus(): Promise<void> {
  try {
    const streamerUserId = getUserId("streamer");

    // Get current stream status from Twitch API
    const currentStream = await getStreamByUserId(streamerUserId);
    const currentStatus: "online" | "offline" = currentStream ? "online" : "offline";

    console.log(`[StreamPolling] Checked stream status: ${currentStatus}`);

    // Check if status has changed since last check
    if (pollingState.lastKnownStatus !== null && pollingState.lastKnownStatus !== currentStatus) {
      console.log(`[StreamPolling] Status change detected: ${pollingState.lastKnownStatus} -> ${currentStatus}`);
      await handleStatusChange(currentStatus, currentStream);
    } else if (pollingState.lastKnownStatus === null) {
      // First check - just set the baseline
      console.log(`[StreamPolling] Initial status baseline set: ${currentStatus}`);
    }

    // Verify database state matches API state
    await verifyDatabaseState(currentStatus, currentStream);

    pollingState.lastKnownStatus = currentStatus;
  } catch (error) {
    console.error("[StreamPolling] Error checking stream status:", error);
  }
}

/**
 * Handle status change between online/offline
 */
async function handleStatusChange(newStatus: "online" | "offline", streamData: any): Promise<void> {
  try {
    if (newStatus === "online" && streamData) {
      console.log(`[StreamPolling] Handling missed stream start event`);

      // Create a mock EventSub event object with the stream data
      const mockEvent = {
        broadcasterUserId: streamData.userId,
        broadcasterUserLogin: streamData.userLogin,
        broadcasterUserName: streamData.userDisplayName,
        id: streamData.id,
        type: streamData.type,
        startedAt: streamData.startDate,
        getStream: () => Promise.resolve(streamData),
      };

      await processStreamOnlineEvent(mockEvent as any);
    } else if (newStatus === "offline") {
      console.log(`[StreamPolling] Handling missed stream end event`);

      // Create a mock EventSub event object
      const mockEvent = {
        broadcasterUserId: getUserId("streamer"),
        broadcasterUserLogin: "vaarattu", // This should match your channel
        broadcasterUserName: "vaarattu",
      };

      await processStreamOfflineEvent(mockEvent as any);
    }
  } catch (error) {
    console.error(`[StreamPolling] Error handling status change to ${newStatus}:`, error);
  }
}

/**
 * Verify that database state matches the actual API state
 */
async function verifyDatabaseState(currentStatus: "online" | "offline", streamData: any): Promise<void> {
  try {
    // Check if we have an open stream in the database
    const openStream = await prisma.stream.findFirst({
      where: { endTime: null },
      orderBy: { startTime: "desc" },
    });

    const hasOpenStreamInDb = openStream !== null;
    const shouldHaveOpenStream = currentStatus === "online";

    if (hasOpenStreamInDb && !shouldHaveOpenStream) {
      console.warn("[StreamPolling] Database shows open stream but API shows offline - correcting database");
      // Stream ended but wasn't caught by EventSub
      const mockEvent = {
        broadcasterUserId: getUserId("streamer"),
        broadcasterUserLogin: "vaarattu",
        broadcasterUserName: "vaarattu",
      };
      await processStreamOfflineEvent(mockEvent as any);
    } else if (!hasOpenStreamInDb && shouldHaveOpenStream && streamData) {
      console.warn("[StreamPolling] API shows online stream but no open stream in database - correcting database");
      // Stream started but wasn't caught by EventSub
      const mockEvent = {
        broadcasterUserId: streamData.userId,
        broadcasterUserLogin: streamData.userLogin,
        broadcasterUserName: streamData.userDisplayName,
        id: streamData.id,
        type: streamData.type,
        startedAt: streamData.startDate,
        getStream: () => Promise.resolve(streamData),
      };
      await processStreamOnlineEvent(mockEvent as any);
    } else {
      // States match - all good
      console.log("[StreamPolling] Database and API states are in sync");
    }

    // Also verify stream state manager is in sync
    const streamStateId = streamState.getCurrentStreamId();
    const hasStreamStateActive = streamStateId !== null;

    if (hasStreamStateActive && !shouldHaveOpenStream) {
      console.warn("[StreamPolling] Stream state manager shows active stream but should be offline - correcting");
      await streamState.endStream();
    } else if (!hasStreamStateActive && shouldHaveOpenStream && openStream) {
      console.warn("[StreamPolling] Stream state manager should be active but isn't - correcting");
      await streamState.startStream(openStream.id);
    }
  } catch (error) {
    console.error("[StreamPolling] Error verifying database state:", error);
  }
}

/**
 * Get current polling status
 */
export function getPollingStatus(): { isPolling: boolean; lastKnownStatus: string | null } {
  return {
    isPolling: pollingState.isPolling,
    lastKnownStatus: pollingState.lastKnownStatus,
  };
}
