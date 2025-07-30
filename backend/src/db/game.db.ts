import { PrismaClient, Game } from "@prisma/client";

const prisma = new PrismaClient();

export async function findOrCreateGame(game: { id: string; name: string; boxArtUrl?: string }): Promise<Game> {
  let dbGame = await prisma.game.findUnique({ where: { id: game.id } });
  if (!dbGame) {
    dbGame = await prisma.game.create({
      data: {
        id: game.id,
        name: game.name,
        boxArtUrl: game.boxArtUrl,
      },
    });
  }
  return dbGame;
}

export async function getGameById(id: string): Promise<Game | null> {
  return prisma.game.findUnique({ where: { id } });
}
