export function twitchRecordingAvailable(stream: {
  twitchVideoId: string | null;
  twitchVideoAvailable: boolean | null;
  twitchVideoCheckedAt: Date | null;
  startTime: Date;
}, now = new Date()): boolean {
  if (!stream.twitchVideoId || stream.twitchVideoAvailable === false) return false;
  if (stream.twitchVideoAvailable === true && stream.twitchVideoCheckedAt && now.getTime() - stream.twitchVideoCheckedAt.getTime() < 24 * 60 * 60 * 1000) return true;
  return now.getTime() - stream.startTime.getTime() < 60 * 24 * 60 * 60 * 1000;
}
