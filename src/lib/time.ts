import { startOfWeek, endOfWeek, format, eachDayOfInterval, isSameDay } from "date-fns";
import type { Session } from "./types";

export const WEEK_OPTS = { weekStartsOn: 1 as const };

export function durationMs(s: Session, now: number): number {
  const end = s.endAt ?? now;
  return Math.max(0, end - s.startAt);
}

export function formatDuration(ms: number, opts: { withSeconds?: boolean } = {}): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (opts.withSeconds) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatHours(ms: number): string {
  const h = ms / 3600000;
  return h.toFixed(2) + " h";
}

export function weekRange(date: Date) {
  return {
    start: startOfWeek(date, WEEK_OPTS),
    end: endOfWeek(date, WEEK_OPTS),
  };
}

export function weekDays(date: Date) {
  const { start, end } = weekRange(date);
  return eachDayOfInterval({ start, end });
}

export function sessionsInWeek(sessions: Session[], date: Date): Session[] {
  const { start, end } = weekRange(date);
  return sessions.filter((s) => s.startAt >= start.getTime() && s.startAt <= end.getTime());
}

export function sessionsOnDay(sessions: Session[], day: Date): Session[] {
  return sessions.filter((s) => isSameDay(new Date(s.startAt), day));
}

export function fmtTime(ts: number): string {
  return format(new Date(ts), "h:mm a");
}

export function fmtDate(ts: number): string {
  return format(new Date(ts), "EEE, MMM d");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): number {
  return new Date(v).getTime();
}
