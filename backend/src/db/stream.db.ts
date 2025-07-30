import prisma from "../prismaClient";
import { Stream } from "@prisma/client";

export async function endLatestStreamForBroadcaster({ userId, endTime }: { userId: string; endTime: Date }) {
  // Find the latest stream for this broadcaster with null endTime
  const latest = await prisma.stream.findFirst({
    where: {
      games: {
        some: {
          streams: {
            some: {}, // just to allow the join
          },
        },
      },
      endTime: null,
    },
    orderBy: { startTime: "desc" },
  });
  if (!latest) return null;
  return prisma.stream.update({
    where: { id: latest.id },
    data: { endTime },
  });
}

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
