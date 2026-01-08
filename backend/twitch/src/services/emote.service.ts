import TwitchEmoticons from "@mkody/twitch-emoticons";
import prisma from "../prismaClient";
import { getUserId, getStreamerAuthProvider } from "../twitch/auth/authProviders";
import { ApiClient } from "@twurple/api";
import { Emote } from "@vaarattu/shared";

const { EmoteFetcher } = TwitchEmoticons;

// In-memory cache for emotes
let emoteCache: Map<string, Emote> = new Map();
let emoteFetcher: any = null;

/**
 * Initialize the emote system - fetch all emotes from all platforms and cache them
 * This should be called once at application startup
 */
export async function initializeEmotes(): Promise<void> {
  console.log("[Emote] Initializing emote system...");

  try {
    // Get the Twurple ApiClient using our existing auth
    const authProvider = await getStreamerAuthProvider();
    const apiClient = new ApiClient({ authProvider });

    // Initialize the emote fetcher with our ApiClient
    emoteFetcher = new EmoteFetcher(undefined, undefined, {
      apiClient: apiClient,
    });

    const streamerChannelId = getUserId("streamer");

    // Fetch emotes from all platforms
    await Promise.all([
      // Twitch global and channel
      emoteFetcher.fetchTwitchEmotes(),
      emoteFetcher.fetchTwitchEmotes(streamerChannelId),

      // BTTV global and channel
      emoteFetcher.fetchBTTVEmotes(),
      emoteFetcher.fetchBTTVEmotes(streamerChannelId),

      // 7TV global and channel
      emoteFetcher.fetchSevenTVEmotes(),
      emoteFetcher.fetchSevenTVEmotes(streamerChannelId),

      // FFZ global and channel
      emoteFetcher.fetchFFZEmotes(),
      emoteFetcher.fetchFFZEmotes(streamerChannelId),
    ]);

    // Sync emotes to database and build cache
    await syncEmotesToDatabase();

    console.log(`[Emote] Initialized ${emoteCache.size} emotes successfully`);
  } catch (error) {
    console.error("[Emote] Failed to initialize emotes:", error);
    throw error;
  }
}

/**
 * Sync emotes from the fetcher to the database
 */
async function syncEmotesToDatabase(): Promise<void> {
  const emotesToSync: any[] = [];

  // Process all emotes from the fetcher
  for (const [emoteName, emoteObj] of emoteFetcher.emotes) {
    try {
      const emoteData = {
        name: emoteName,
        platform: emoteObj.type, // The library already provides the platform type
        emoteId: String(emoteObj.id || emoteObj.code || emoteName), // Convert to string (FFZ uses ints)
        imageUrl: emoteObj.toLink ? emoteObj.toLink(1) : null, // Pass size parameter
        isGlobal: !emoteObj.channelId,
        channelId: emoteObj.channelId ? String(emoteObj.channelId) : null, // Convert to string
      };

      emotesToSync.push(emoteData);
    } catch (err) {
      console.warn(`[Emote] Failed to process emote ${emoteName}:`, err);
    }
  }

  if (emotesToSync.length === 0) {
    console.warn("[Emote] No emotes to sync");
    return;
  }

  // Bulk upsert emotes to database
  const existingEmotes = await prisma.emote.findMany();

  // Create maps for both unique constraints
  const existingByNamePlatform = new Map(existingEmotes.map((e) => [`${e.name}_${e.platform}`, e]));
  const existingByPlatformEmoteId = new Map(existingEmotes.map((e) => [`${e.platform}_${e.emoteId}`, e]));

  const toCreate: any[] = [];
  const toUpdate: { id: number; data: any }[] = [];
  const toDelete: number[] = []; // IDs to delete due to conflicts

  for (const emoteData of emotesToSync) {
    const nameKey = `${emoteData.name}_${emoteData.platform}`;
    const emoteIdKey = `${emoteData.platform}_${emoteData.emoteId}`;
    const existingByName = existingByNamePlatform.get(nameKey);
    const existingByEmoteId = existingByPlatformEmoteId.get(emoteIdKey);

    if (!existingByName) {
      // New emote by name+platform
      // But check if platform+emoteId already exists with different name
      if (existingByEmoteId && existingByEmoteId.name !== emoteData.name) {
        // Conflict: same platform+emoteId but different name
        // Mark the old one for deletion and create new
        toDelete.push(existingByEmoteId.id);
        toCreate.push(emoteData);
      } else if (!existingByEmoteId) {
        toCreate.push(emoteData);
      }
      // If existingByEmoteId has same name, it's the same emote, skip
    } else {
      // Emote exists by name+platform, check if update is needed
      const needsUpdate =
        existingByName.emoteId !== emoteData.emoteId ||
        existingByName.imageUrl !== emoteData.imageUrl ||
        existingByName.isGlobal !== emoteData.isGlobal ||
        existingByName.channelId !== emoteData.channelId;

      if (needsUpdate) {
        // Check if the new emoteId would conflict with another record
        if (existingByEmoteId && existingByEmoteId.id !== existingByName.id) {
          // The new emoteId is already used by a different emote record
          // Delete the conflicting record first
          toDelete.push(existingByEmoteId.id);
        }

        toUpdate.push({
          id: existingByName.id,
          data: {
            emoteId: emoteData.emoteId,
            imageUrl: emoteData.imageUrl,
            isGlobal: emoteData.isGlobal,
            channelId: emoteData.channelId,
          },
        });
      }
    }
  }

  // Execute database operations
  let added = 0;
  let updated = 0;
  let deleted = 0;

  // Delete conflicting records first (before creates and updates)
  const uniqueToDelete = [...new Set(toDelete)];
  if (uniqueToDelete.length > 0) {
    // First delete associated EmoteUsage records to avoid foreign key constraint violation
    await prisma.emoteUsage.deleteMany({
      where: { emoteId: { in: uniqueToDelete } },
    });

    // Then delete the emote records
    await prisma.emote.deleteMany({
      where: { id: { in: uniqueToDelete } },
    });
    deleted = uniqueToDelete.length;
    console.log(`[Emote] Deleted ${deleted} conflicting emote records and their usage data`);
  }

  if (toCreate.length > 0) {
    await prisma.emote.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    added = toCreate.length;
  }

  // Filter out updates for records that were deleted
  const deleteSet = new Set(uniqueToDelete);
  const validUpdates = toUpdate.filter((item) => !deleteSet.has(item.id));

  if (validUpdates.length > 0) {
    await prisma.$transaction(
      validUpdates.map((item) =>
        prisma.emote.update({
          where: { id: item.id },
          data: item.data,
        })
      )
    );
    updated = validUpdates.length;
  }

  // Rebuild cache with fresh data
  await rebuildEmoteCache();

  console.log(`[Emote] Synced emotes: +${added} new, ~${updated} updated, -${deleted} deleted`);
}

/**
 * Rebuild the in-memory emote cache from database
 */
async function rebuildEmoteCache(): Promise<void> {
  const emotes = await prisma.emote.findMany();
  emoteCache.clear();

  for (const emote of emotes) {
    emoteCache.set(emote.name, emote);
  }
}

/**
 * Track emote usage in a message
 * Parses the message text and increments usage counts for found emotes
 */
export async function trackEmoteUsage(userId: number, messageText: string): Promise<void> {
  if (emoteCache.size === 0) {
    console.warn("[Emote] Emote cache is empty, skipping emote tracking");
    return;
  }

  try {
    // Find all emotes in the message text
    const foundEmotes = findEmotesInText(messageText);

    if (foundEmotes.length === 0) {
      return; // No emotes found
    }

    // Track usage for each emote
    await Promise.all(foundEmotes.map((emote) => incrementEmoteUsage(userId, emote.id)));

    console.log(`[Emote] Tracked ${foundEmotes.length} emote usages for user ${userId}`);
  } catch (error) {
    console.error("[Emote] Error tracking emote usage:", error);
  }
}

/**
 * Find emotes in message text using the EmoteParser
 */
function findEmotesInText(text: string): Emote[] {
  const foundEmotes: Emote[] = [];

  if (!emoteFetcher || !emoteCache) {
    console.warn("[Emote] Emote system not properly initialized");
    return foundEmotes;
  }

  try {
    // Extract words and check each against the fetcher's emotes
    const words = text.match(/\b\w+\b/g) || [];

    for (const word of words) {
      // Check if this word exists in the fetcher's emotes
      if (emoteFetcher.emotes.has(word)) {
        // Get the emote from our database cache
        const cachedEmote = emoteCache.get(word);
        if (cachedEmote) {
          foundEmotes.push(cachedEmote);
        }
      }
    }
  } catch (error) {
    console.warn("[Emote] Error parsing emotes from text:", error);
  }

  return foundEmotes;
}

/**
 * Increment emote usage count for a user (upsert pattern)
 */
async function incrementEmoteUsage(userId: number, emoteId: number): Promise<void> {
  await prisma.emoteUsage.upsert({
    where: {
      userId_emoteId: {
        userId,
        emoteId,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      userId,
      emoteId,
      count: 1,
    },
  });
}

/**
 * Get top emotes for a user
 */
export async function getUserTopEmotes(userId: number, limit: number = 10) {
  return await prisma.emoteUsage.findMany({
    where: { userId },
    include: { emote: true },
    orderBy: { count: "desc" },
    take: limit,
  });
}

/**
 * Get global emote leaderboard
 */
export async function getGlobalEmoteLeaderboard(limit: number = 20) {
  return await prisma.emoteUsage.groupBy({
    by: ["emoteId"],
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: limit,
  });
}

/**
 * Refresh emotes (can be called periodically)
 */
export async function refreshEmotes(): Promise<void> {
  console.log("[Emote] Refreshing emotes...");
  await initializeEmotes();
}
