import type { StreamDetail } from "@/types/api";

/** Stream archive dates consistently use the channel's calendar, including shared links. */
export function formatStreamDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function archiveReturnTo(value: string | null): string {
  return value === "/vods" || value?.startsWith("/vods?") ? value : "/vods";
}

export function streamContext(returnTo: string): string {
  return returnTo === "/vods" ? "" : `?${new URLSearchParams({ returnTo })}`;
}

export function formatStreamTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor(whole / 60) % 60;
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export function parseStreamTime(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds <= 2147483647 ? seconds : null;
}

export function watchHref(streamId: number, seconds: number, returnTo = "/vods", source?: string): string {
  const params = new URLSearchParams({ t: String(Math.max(0, Math.floor(seconds))) });
  if (source) params.set("source", source);
  if (returnTo !== "/vods") params.set("returnTo", returnTo);
  return `/vods/${streamId}/watch?${params}`;
}

export function firstRecordingTime(vod: StreamDetail): number {
  return vod.twitchVideoId && vod.twitchVideoAvailable ? 0 : Math.max(0, vod.youtubeVideos[0]?.streamOffsetSeconds ?? 0);
}

/** Convert a stream timestamp to provider time; a gap must never silently become zero. */
export function recordingAt(vod: StreamDetail, seconds: number, preferredSource?: string | null) {
  if (vod.endTime && seconds >= (Date.parse(vod.endTime) - Date.parse(vod.startTime)) / 1000) return null;
  const twitch = vod.twitchVideoId && vod.twitchVideoAvailable;
  if (twitch && (!preferredSource || preferredSource === "twitch")) {
    return { provider: "twitch" as const, videoId: vod.twitchVideoId!, offset: 0, start: seconds };
  }
  const video = vod.youtubeVideos.find(item => (!preferredSource || item.id === preferredSource) && seconds >= item.streamOffsetSeconds && seconds < item.streamOffsetSeconds + item.durationSeconds);
  return video ? { provider: "youtube" as const, videoId: video.id, offset: video.streamOffsetSeconds, start: seconds - video.streamOffsetSeconds } : null;
}
