import type { Prisma } from "@vaarattu/shared";
import prisma from "../prismaClient";
import { calculateOffset } from "../utils/pagination";

export interface ClipFilters { q?: string; sort: "popular" | "newest"; period: "all" | "7d" | "30d"; featured: boolean }
const preview = {
  id: true, title: true, creatorName: true, gameName: true, thumbnailUrl: true,
  createdAt: true, durationSeconds: true, viewCount: true, isFeatured: true, checkedAt: true,
} satisfies Prisma.ClipSelect;

export async function getClips(page: number, limit: number, filters: ClipFilters) {
  const where: Prisma.ClipWhereInput = { available: true };
  if (filters.featured) where.isFeatured = true;
  if (filters.period !== "all") where.createdAt = { gte: new Date(Date.now() - (filters.period === "7d" ? 7 : 30) * 86400000) };
  if (filters.q) {
    const contains = filters.q.replace(/[\\%_]/g, "\\$&");
    where.OR = ["title", "creatorName", "gameName"].map(field => ({ [field]: { contains, mode: "insensitive" } }));
  }
  const orderBy: Prisma.ClipOrderByWithRelationInput[] = [
    ...(filters.sort === "popular" ? [{ viewCount: "desc" as const }] : []), { createdAt: "desc" }, { id: "desc" },
  ];
  const [clips, total] = await Promise.all([
    prisma.clip.findMany({ where, select: preview, orderBy, skip: calculateOffset(page, limit), take: limit }),
    prisma.clip.count({ where }),
  ]);
  return { clips, total };
}

export async function getClip(id: string) {
  const clip = await prisma.clip.findUnique({ where: { id }, select: { ...preview, available: true, videoId: true, vodOffsetSeconds: true } });
  if (!clip) return null;
  const stream = clip.videoId ? await prisma.stream.findUnique({ where: { twitchVideoId: clip.videoId }, select: { id: true } }) : null;
  return { ...clip, streamId: stream?.id ?? null };
}
