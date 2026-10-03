import { parseChoice, parseTextQuery, RequestValidationError } from "./validation";

export interface StreamFilters {
  q?: string;
  from?: Date;
  until?: Date;
  recording?: "all" | "available";
}

const helsinkiOffset = new Intl.DateTimeFormat("en", { timeZone: "Europe/Helsinki", timeZoneName: "longOffset" });

function parseDay(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RequestValidationError(`${name} must be YYYY-MM-DD`);
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value || value < "1970-01-01" || value > "9998-12-31") {
    throw new RequestValidationError(`${name} must be a valid date from 1970 to 9998`);
  }
  return timestamp;
}

function helsinkiMidnight(utcDay: number): Date {
  // Helsinki's DST changes happen after midnight. Resolve each boundary's own
  // offset, rather than adding 24h to a local day (which may be 23 or 25h).
  const offset = helsinkiOffset.formatToParts(utcDay).find(part => part.type === "timeZoneName")!.value;
  const [, hours, minutes] = /GMT\+(\d{2}):(\d{2})/.exec(offset)!;
  return new Date(utcDay - (Number(hours) * 60 + Number(minutes)) * 60000);
}

export function parseStreamFilters(query: Record<string, unknown>): StreamFilters {
  const from = parseDay(query.from, "From");
  const to = parseDay(query.to, "To");
  if (from !== undefined && to !== undefined && from > to) throw new RequestValidationError("From must be on or before To");
  return {
    q: parseTextQuery(query.q, "Search"),
    from: from === undefined ? undefined : helsinkiMidnight(from),
    until: to === undefined ? undefined : helsinkiMidnight(to + 86400000),
    recording: parseChoice(query.recording, "recording filter", ["all", "available"] as const, "all"),
  };
}
