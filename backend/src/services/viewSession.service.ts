import prisma from "../prismaClient";
import { upsertUserFromTwitch } from "./user.service";
import { HelixChatChatter } from "@twurple/api";

/**
 * Process viewer sessions based on the list of present chatters.
 * - Ends sessions for users no longer present
 * - Starts sessions for new users
 * - Ensures user info is up-to-date
 * @param chatters Array of HelixChatChatter (current chatters)
 */
export async function processViewerSessions(chatters: HelixChatChatter[]) {
  const now = new Date();
  // 1. Ensure all users are up-to-date in DB
  const userIdMap: Record<string, number> = {};

  for (const chatter of chatters) {
    const user = await upsertUserFromTwitch(chatter.userId);
    if (!user) {
      console.warn(`[EventSub] User not found or stale, unable to process message: ${chatter.userId}`);
      return;
    }
    userIdMap[chatter.userId] = user.id;
  }

  // 2. Get open sessions only for users who are no longer present
  const presentUserIds = Object.values(userIdMap);
  const sessionsToEnd = await prisma.viewSession.findMany({
    where: {
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
      sessionEnd: null,
      userId: { in: presentUserIds },
    },
  });
  const openSessionUserIds = new Set(openSessions.map((s) => s.userId));

  // 4. Start sessions for new users
  const newUserIds = Array.from(presentUserIds).filter((id) => !openSessionUserIds.has(id));
  await Promise.all(
    newUserIds.map((userId) =>
      prisma.viewSession.create({
        data: {
          userId,
          sessionStart: now,
          sessionEnd: null,
        },
      })
    )
  );
}
