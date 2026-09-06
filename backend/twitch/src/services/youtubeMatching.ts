export interface MatchStream {
  id: number;
  startTime: Date;
  youtubeMatchLocked: boolean;
  segments: { title: string }[];
}

export interface MatchVideo {
  id: string;
  title: string;
  available: boolean;
  streamId: number | null;
  matchSource: string;
}

export function parseTitle(title: string) {
  const dateMatch = title.match(/^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*[-–—:]?\s*/);
  let date: string | null = null;
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const candidate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${candidate}T12:00:00Z`);
    if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate) date = candidate;
  }
  const partMatch = title.match(/\b(?:part|osa|pt)\.?\s*(\d+)(?:\s*(?:\/|of)\s*\d+)?\b/i);
  const text = title
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(dateMatch && date ? dateMatch[0] : /^$/, " ")
    .replace(/\b(?:part|osa|pt)\.?\s*\d+(?:\s*(?:\/|of)\s*\d+)?\b/gi, " ")
    .normalize("NFKC").toLocaleLowerCase("fi-FI")
    .replace(/[^a-z0-9äöå]+/g, " ").trim().replace(/\s+/g, " ");
  return { text, date, part: partMatch ? Number(partMatch[1]) : null };
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const numbers = (value: string) => (value.match(/\d+/g) ?? []).sort().join(",");
  if (numbers(a) !== numbers(b)) return 0;
  const left = new Set(a.split(" "));
  const right = new Set(b.split(" "));
  const overlap = [...left].filter((word) => right.has(word)).length;
  const tokens = 2 * overlap / (left.size + right.size);
  // Character bigrams tolerate small spelling changes without discarding word order.
  const grams = (value: string) => {
    const result = new Map<string, number>();
    for (let i = 0; i < value.length - 1; i++) {
      const gram = value.slice(i, i + 2);
      result.set(gram, (result.get(gram) ?? 0) + 1);
    }
    return result;
  };
  const ag = grams(a);
  const bg = grams(b);
  let common = 0;
  for (const [gram, count] of ag) common += Math.min(count, bg.get(gram) ?? 0);
  return Math.max(tokens, 2 * common / Math.max(1, a.length + b.length - 2));
}

export function rankMatches(streams: MatchStream[], videos: MatchVideo[]) {
  const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit" });
  const parsedVideos = videos.filter((video) => video.available && video.matchSource !== "blocked").map((video) => ({ video, parsed: parseTitle(video.title) }));
  const candidates = streams.flatMap((stream) => {
    const parts = dateFormat.formatToParts(stream.startTime);
    const day = (type: string) => parts.find((part) => part.type === type)!.value;
    const streamDate = `${day("year")}-${day("month")}-${day("day")}`;
    const titles = stream.segments.map((segment) => parseTitle(segment.title).text);
    return parsedVideos.filter(({ parsed }) => !parsed.date || parsed.date === streamDate).map(({ video, parsed }) => {
      const score = Math.max(0, ...titles.map((title) => similarity(title, parsed.text)));
      return { streamId: stream.id, videoId: video.id, score, part: parsed.part, hasDate: parsed.date !== null, text: parsed.text };
    }).filter((candidate) => candidate.score >= 0.45);
  });
  candidates.sort((a, b) => b.score - a.score || a.videoId.localeCompare(b.videoId) || a.streamId - b.streamId);
  const automatic = candidates.filter((candidate) => {
    const stream = streams.find((item) => item.id === candidate.streamId)!;
    const video = videos.find((item) => item.id === candidate.videoId)!;
    if (stream.youtubeMatchLocked || video.streamId !== null || videos.some((item) => item.streamId === stream.id && item.available)) return false;
    if (candidate.part !== null || candidate.score < 0.88) return false;
    if (!candidate.hasDate && (candidate.text.length < 10 || candidate.text.split(" ").length < 2)) return false;
    // Require an unambiguous winner in BOTH directions; never take a loser's next choice.
    return !candidates.some((other) => other !== candidate &&
      (other.streamId === candidate.streamId || other.videoId === candidate.videoId) && other.score > candidate.score - 0.1);
  });
  return { candidates, automatic };
}
