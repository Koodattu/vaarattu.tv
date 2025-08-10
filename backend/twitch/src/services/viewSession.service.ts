import prisma from "../prismaClient";
import { upsertUserFromTwitch } from "./user.service";
import { HelixChatChatter } from "@twurple/api";

/**
 * Handles a single user joining the chat.
 * Upserts the user and starts a viewing session if none exists.
 * @param username The username of the user who joined
 * @param streamId The current active stream ID
 */
export async function handleUserJoin(username: string, streamId: number) {
  console.log(`[Chat Join] Processing join for: ${username}`);

  const user = await upsertUserFromTwitch(username);
  if (!user) {
    console.warn(`[Chat Join] Failed to upsert user: ${username}`);
    return;
  }

  // Check if user already has an open session for this stream
  const existingSession = await prisma.viewSession.findFirst({
    where: {
      userId: user.id,
      streamId: streamId,
      sessionEnd: null,
    },
  });

  if (existingSession) {
    console.log(`[Chat Join] User ${username} already has an open session for stream ${streamId}, skipping`);
    return;
  }

  // Start new session
  const now = new Date();
  await prisma.viewSession.create({
    data: {
      userId: user.id,
      streamId: streamId,
      sessionStart: now,
      sessionEnd: null,
    },
  });

  console.log(`[Chat Join] Started new session for: ${username} on stream ${streamId}`);
}

/**
 * Handles a single user leaving the chat.
 * Ends the viewing session if one exists.
 * @param username The username of the user who left
 * @param streamId The current active stream ID
 */
export async function handleUserPart(username: string, streamId: number) {
  console.log(`[Chat Part] Processing part for: ${username}`);

  const user = await upsertUserFromTwitch(username);
  if (!user) {
    console.warn(`[Chat Part] Failed to upsert user: ${username}`);
    return;
  }

  // Find open session for this user and stream
  const openSession = await prisma.viewSession.findFirst({
    where: {
      userId: user.id,
      streamId: streamId,
      sessionEnd: null,
    },
  });

  if (!openSession) {
    console.log(`[Chat Part] User ${username} has no open session for stream ${streamId}, skipping`);
    return;
  }

  // End the session
  const now = new Date();
  await prisma.viewSession.update({
    where: { id: openSession.id },
    data: { sessionEnd: now },
  });

  console.log(`[Chat Part] Ended session for: ${username} on stream ${streamId}`);
}

/**
 * Process viewer sessions based on the list of present chatters.
 * - Ends sessions for users no longer present
 * - Starts sessions for new users
 * - Ensures user info is up-to-date
 * @param chatters Array of HelixChatChatter (current chatters)
 * @param streamId The current active stream ID
 */
export async function processViewerSessions(chatters: HelixChatChatter[], streamId: number) {
  const now = new Date();
  // 1. Ensure all users are up-to-date in DB
  const userIdMap: Record<string, number> = {};

  for (const chatter of chatters) {
    const user = await upsertUserFromTwitch(chatter.userName);
    if (!user) {
      console.warn(`[EventSub] User not found or stale, unable to process message: ${chatter.userName}`);
      return;
    }
    userIdMap[chatter.userId] = user.id;
  }

  // 2. Get open sessions only for users who are no longer present (for this stream)
  const presentUserIds = Object.values(userIdMap);
  const sessionsToEnd = await prisma.viewSession.findMany({
    where: {
      streamId: streamId,
      sessionEnd: null,
      userId: { notIn: presentUserIds },
    },
  });

  // 3. End sessions for users no longer present
  await Promise.all(
    sessionsToEnd.map((session) =>
      prisma.viewSession.update({
        where: { id: session.id },
        data: { sessionEnd: now },
      })
    )
  );

  // 4. Get all open sessions for present users (to avoid duplicate sessions)
  const openSessions = await prisma.viewSession.findMany({
    where: {
      streamId: streamId,
      sessionEnd: null,
      userId: { in: presentUserIds },
    },
  });
  const openSessionUserIds = new Set(openSessions.map((s) => s.userId));

  // 5. Start sessions for new users
  const newUserIds = Array.from(presentUserIds).filter((id) => !openSessionUserIds.has(id));
  await Promise.all(
    newUserIds.map((userId) =>
      prisma.viewSession.create({
        data: {
          userId,
          streamId: streamId,
          sessionStart: now,
          sessionEnd: null,
        },
      })
    )
  );
}

/**
 * End all currently active viewing sessions.
 * Used when a stream ends to close all open sessions.
 */
export async function endAllActiveViewSessions(): Promise<void> {
  const now = new Date();

  console.log("[ViewSession] Ending all active viewing sessions...");

  const result = await prisma.viewSession.updateMany({
    where: { sessionEnd: null },
    data: { sessionEnd: now },
  });

  console.log(`[ViewSession] Ended ${result.count} active viewing sessions`);
}
