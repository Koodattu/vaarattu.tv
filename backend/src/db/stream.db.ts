import { PrismaClient, Stream } from "@prisma/client";

const prisma = new PrismaClient();

export async function createStreamWithGame({
  id,
  title,
  startTime,
  thumbnailUrl,
  gameId,
}: {
  id?: number;
  title: string;
  startTime: Date;
  thumbnailUrl?: string;
  gameId: string;
}): Promise<Stream> {
  return prisma.stream.create({
    data: {
      id,
      title,
      startTime,
      thumbnailUrl,
      games: { connect: { id: gameId } },
    },
  });
}
