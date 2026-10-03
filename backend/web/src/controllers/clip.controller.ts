import type { Request, Response } from "express";
import { getClip, getClips } from "../services/clip.service";
import { parseChoice, parseTextQuery, RequestValidationError } from "../utils/validation";
import { createPaginationInfo, parsePaginationQuery } from "../utils/pagination";

export async function listClips(req: Request, res: Response) {
  const { page, limit } = parsePaginationQuery(req.query);
  const { clips, total } = await getClips(page, limit, {
    q: parseTextQuery(req.query.q, "Search"),
    sort: parseChoice(req.query.sort, "clip sort", ["popular", "newest"] as const, "popular"),
    period: parseChoice(req.query.period, "clip period", ["all", "7d", "30d"] as const, "all"),
    featured: parseChoice(req.query.featured, "featured filter", ["true", "false"] as const, "false") === "true",
  });
  res.json({ success: true, data: clips, pagination: createPaginationInfo(page, limit, total) });
}

export async function showClip(req: Request, res: Response) {
  if (typeof req.params.id !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(req.params.id)) throw new RequestValidationError("Invalid clip ID");
  const clip = await getClip(req.params.id);
  if (!clip) { res.status(404).json({ success: false, error: "Clip not found" }); return; }
  res.json({ success: true, data: clip });
}
