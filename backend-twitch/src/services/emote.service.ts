import TwitchEmoticons from "@mkody/twitch-emoticons";
import prisma from "../prismaClient";
import { getUserId, getStreamerAuthProvider } from "../twitch/auth/authProviders";
import { ApiClient } from "@twurple/api";
import { Emote } from "@prisma/client";

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
  const existingEmoteMap = new Map(existingEmotes.map((e) => [`${e.name}_${e.platform}`, e]));

  const toCreate: any[] = [];
  const toUpdate: { id: number; data: any }[] = [];

  for (const emoteData of emotesToSync) {
    const key = `${emoteData.name}_${emoteData.platform}`;
    const existing = existingEmoteMap.get(key);

    if (!existing) {
      toCreate.push(emoteData);
    } else {
      // Check if update is needed
      const needsUpdate =
        existing.emoteId !== emoteData.emoteId ||
        existing.imageUrl !== emoteData.imageUrl ||
        existing.isGlobal !== emoteData.isGlobal ||
        existing.channelId !== emoteData.channelId;

      if (needsUpdate) {
        toUpdate.push({
          id: existing.id,
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

  if (toCreate.length > 0) {
    await prisma.emote.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    added = toCreate.length;
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((item) =>
        prisma.emote.update({
          where: { id: item.id },
          data: item.data,
        })
      )
    );
    updated = toUpdate.length;
  }

  // Rebuild cache with fresh data
  await rebuildEmoteCache();

  console.log(`[Emote] Synced emotes: +${added} new, ~${updated} updated`);
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
