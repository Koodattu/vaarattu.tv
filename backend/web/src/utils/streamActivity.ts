import type { StreamActivity } from "../types/api.types";

export interface ActivityMinute {
  minute: number;
  messages: number;
  chatters: number;
}

export function buildStreamActivity(
  startTime: Date,
  endTime: Date,
  sessions: Array<{ userId: number; sessionStart: Date; sessionEnd: Date | null }>,
  minutes: ActivityMinute[],
): StreamActivity {
  const start = startTime.getTime();
  const end = endTime.getTime();
  const duration = end - start;
  const intervalMinutes = Math.max(1, Math.ceil(duration / 60000 / 300));
  if (duration <= 0) return { intervalMinutes, points: [] };

  const interval = intervalMinutes * 60000;
  const points: StreamActivity["points"] = Array.from({ length: Math.ceil(duration / interval) }, (_, index) => ({
    time: new Date(start + index * interval).toISOString(),
    endTime: new Date(Math.min(end, start + (index + 1) * interval)).toISOString(),
    viewers: null,
    messagesPerMinute: 0,
    activeChatters: 0,
  }));
  for (const minute of minutes) {
    const index = Math.floor(minute.minute / intervalMinutes);
    const point = points[index];
    if (!point || minute.minute < 0) continue;
    const observedMinutes = (Math.min(end, start + (index + 1) * interval) - (start + index * interval)) / 60000;
    point.messagesPerMinute += minute.messages / observedMinutes;
    point.activeChatters = Math.max(point.activeChatters, minute.chatters);
  }

  const events: Array<{ time: number; userId: number; delta: number }> = [];
  for (const session of sessions) {
    const from = Math.max(start, session.sessionStart.getTime());
    const to = Math.min(end, session.sessionEnd?.getTime() ?? end);
    if (from >= to) continue;
    events.push({ time: from, userId: session.userId, delta: 1 }, { time: to, userId: session.userId, delta: -1 });
  }
  events.sort((a, b) => a.time - b.time || a.delta - b.delta);
  const active = new Map<number, number>();
  let eventIndex = 0;
  for (let index = 0; index < points.length && events.length > 0; index++) {
    const from = start + index * interval;
    const to = Math.min(end, from + interval);
    let peak = 0;
    while (eventIndex < events.length && events[eventIndex].time < to) {
      const time = events[eventIndex].time;
      if (time > from) peak = Math.max(peak, active.size);
      // Apply simultaneous joins and departures together; repeated sessions count once per person.
      while (eventIndex < events.length && events[eventIndex].time === time) {
        const event = events[eventIndex++];
        const count = (active.get(event.userId) ?? 0) + event.delta;
        if (count > 0) active.set(event.userId, count);
        else active.delete(event.userId);
      }
      peak = Math.max(peak, active.size);
    }
    points[index].viewers = Math.max(peak, active.size);
  }
  return { intervalMinutes, points };
}
