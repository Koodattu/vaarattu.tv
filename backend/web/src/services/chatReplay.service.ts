import prisma from "../prismaClient";

export function parseReplayQuery(query: Record<string, unknown>) {
  const start = typeof query.start === "string" && /^\d+$/.test(query.start) ? Number(query.start) : NaN;
  if (!Number.isSafeInteger(start) || start < 0 || start > 2147483647) return null;
  let after: { milliseconds: number; id: number } | null = null;
  if (query.after !== undefined) {
    if (typeof query.after !== "string" || !/^\d+:\d+$/.test(query.after)) return null;
    const [milliseconds, id] = query.after.split(":").map(Number);
    if (!Number.isSafeInteger(milliseconds) || milliseconds < start * 1000 || milliseconds >= (start + 30) * 1000 || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) return null;
    after = { milliseconds, id };
  }
  return { start, after };
}

export async function getChatReplay(streamId: number, query: NonNullable<ReturnType<typeof parseReplayQuery>>) {
  const stream = await prisma.stream.findUnique({ where: { id: streamId }, select: { startTime: true, endTime: true } });
  if (!stream) return null;
  const startTime = new Date(stream.startTime.getTime() + query.start * 1000);
  const endTime = new Date(Math.min(stream.startTime.getTime() + (query.start + 30) * 1000, stream.endTime?.getTime() ?? Infinity));
  const afterTime = query.after ? new Date(stream.startTime.getTime() + query.after.milliseconds) : null;
  const rows = await prisma.message.findMany({
    where: {
      streamId, timestamp: { gte: startTime, lt: endTime },
      ...(query.after && afterTime ? { OR: [
        { timestamp: { gt: afterTime } },
        { timestamp: afterTime, id: { gt: query.after.id } },
      ] } : {}),
    },
    select: { id: true, timestamp: true, content: true, user: { select: { login: true, displayName: true } } },
    orderBy: [{ timestamp: "asc" }, { id: "asc" }], take: 501,
  });
  const messages = rows.slice(0, 500).map((row) => ({
    id: row.id, offsetSeconds: (row.timestamp.getTime() - stream.startTime.getTime()) / 1000,
    content: row.content, user: row.user,
  }));
  const last = messages[messages.length - 1];
  return { messages, nextCursor: rows.length > 500 ? `${Math.round(last.offsetSeconds * 1000)}:${last.id}` : null };
}
