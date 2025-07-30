import { findOrCreateGame } from "../db/game.db";
import { createStreamWithGame } from "../db/stream.db";

/**
 * Handles stream start: ensures game exists, creates stream entry, associates game.
 * @param streamInfo Twitch stream info object (id, title, started_at, thumbnail_url, game_id, game_name, box_art_url)
 */
export async function handleStreamOnline(streamInfo: {
  title: string;
  started_at: string;
  thumbnail_url?: string;
  game_id: string;
  game_name: string;
  box_art_url?: string;
}) {
  // Ensure game exists
  const game = await findOrCreateGame({
    id: streamInfo.game_id,
    name: streamInfo.game_name,
    boxArtUrl: streamInfo.box_art_url,
  });

  // Create stream entry and associate game
  const stream = await createStreamWithGame({
    title: streamInfo.title,
    startTime: new Date(streamInfo.started_at),
    thumbnailUrl: streamInfo.thumbnail_url,
    gameId: game.id,
  });

  return stream;
}
