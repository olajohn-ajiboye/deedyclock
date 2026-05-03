import { useMemo, useState } from "react";
import { addWeeks, format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Download, Pencil } from "lucide-react";
import { useStore, useNow } from "@/lib/store";
import { AvatarTile } from "@/components/AvatarTile";
import { Button } from "@/components/ui/button";
import {
  durationMs,
  formatDuration,
  formatHours,
  fmtTime,
  weekDays,
  weekRange,
  sessionsInWeek,
  sessionsOnDay,
} from "@/lib/time";
import { EditSessionDrawer } from "@/components/EditSessionDrawer";

export default function WeeklyReportPage() {
  const [anchor, setAnchor] = useState(new Date());
  const workers = useStore((s) => s.workers);
  const customers = useStore((s) => s.customers);
  const sessions = useStore((s) => s.sessions);
  const now = useNow();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { start, end } = weekRange(anchor);
  const days = weekDays(anchor);
  const weekSessions = useMemo(
    () => sessionsInWeek(sessions, anchor),
    [sessions, anchor],
  );

  const totalMs = weekSessions.reduce((acc, s) => acc + durationMs(s, now), 0);

  const topCustomer = (() => {
    const map = new Map<string, number>();
    weekSessions.forEach((s) => {
      const key = s.customerSquareId ?? `name:${s.customerName}`;
      map.set(key, (map.get(key) ?? 0) + durationMs(s, now));
    });
    let topKey: string | null = null;
    let topMs = 0;
    map.forEach((v, k) => {
      if (v > topMs) {
        topMs = v;
        topKey = k;
      }
    });
    if (!topKey) return null;
    if (topKey.startsWith("name:")) return { name: topKey.slice(5) };
    const c = customers.find((x) => x.squareId === topKey);
    return c ?? { name: weekSessions.find((s) => s.customerSquareId === topKey)?.customerName ?? "—" };
  })();

  function handleExport() {
    const rows = [
      ["Date", "Loctician", "Client", "Start", "End", "Hours"],
      ...weekSessions
        .slice()
        .sort((a, b) => a.startAt - b.startAt)
        .map((s) => {
          const w = workers.find((x) => x.id === s.workerId);
          const ms = durationMs(s, now);
          return [
            format(new Date(s.startAt), "yyyy-MM-dd"),
            w?.name ?? "",
            s.customerName,
            format(new Date(s.startAt), "HH:mm"),
            s.endAt ? format(new Date(s.endAt), "HH:mm") : "active",
            (ms / 3600000).toFixed(2),
          ];
        }),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salon-hours-${format(start, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div>
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground mb-2">
            Weekly report
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
          </h2>
        </div>
        <div className="lg:ml-auto flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={() => setAnchor((d) => addWeeks(d, -1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-xl px-4"
            onClick={() => setAnchor(new Date())}
          >
            This week
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={() => setAnchor((d) => addWeeks(d, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button onClick={handleExport} className="h-12 rounded-xl px-4">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Total hours"
          value={formatDuration(totalMs)}
        />
        <SummaryCard
          label="Sessions"
          value={String(weekSessions.length)}
        />
        <SummaryCard
          label="Top client"
          value={topCustomer?.name ?? "—"}
        />
      </div>

      <div className="space-y-4">
        {workers
          .filter((w) => !w.archived || weekSessions.some((s) => s.workerId === w.id))
          .map((w) => {
            const wSessions = weekSessions.filter((s) => s.workerId === w.id);
            if (wSessions.length === 0) return null;
            const wTotal = wSessions.reduce(
              (acc, s) => acc + durationMs(s, now),
              0,
            );
            const dailyMax = Math.max(
              ...days.map((d) =>
                sessionsOnDay(wSessions, d).reduce(
                  (a, s) => a + durationMs(s, now),
                  0,
                ),
              ),
              1,
            );
            // Per-customer breakdown
            const perCust = new Map<string, { ms: number; count: number; name: string; squareId: string | null }>();
            wSessions.forEach((s) => {
              const key = s.customerSquareId ?? `name:${s.customerName}`;
              const cur = perCust.get(key) ?? { ms: 0, count: 0, name: s.customerName, squareId: s.customerSquareId };
              cur.ms += durationMs(s, now);
              cur.count += 1;
              perCust.set(key, cur);
            });
            const breakdown = [...perCust.values()]
              .map((v) => ({
                customer: v.squareId ? customers.find((c) => c.squareId === v.squareId) : undefined,
                name: v.name,
                ms: v.ms,
                count: v.count,
              }))
              .sort((a, b) => b.ms - a.ms);

            const weeklyEarned =
              typeof w.hourlyRate === "number" && w.hourlyRate > 0
                ? (wTotal / 3_600_000) * w.hourlyRate
                : null;

            return (
              <div
                key={w.id}
                className="rounded-3xl bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border">
                  <AvatarTile name={w.name} color={w.color} size="lg" />
                  <div className="flex-1">
                    <h3 className="font-display text-2xl font-semibold">
                      {w.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {wSessions.length} sessions ·{" "}
                      {breakdown.length} {breakdown.length === 1 ? "client" : "clients"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Week total
                    </p>
                    <p className="font-display text-3xl font-semibold tabular-nums">
                      {formatDuration(wTotal)}
                    </p>
                    {weeklyEarned !== null && (
                      <p className="mt-1 text-sm font-medium tabular-nums text-muted-foreground">
                        ${weeklyEarned.toFixed(2)} earned
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 sm:p-6 grid grid-cols-7 gap-2 border-b border-border">
                  {days.map((d) => {
                    const dayMs = sessionsOnDay(wSessions, d).reduce(
                      (a, s) => a + durationMs(s, now),
                      0,
                    );
                    const pct = (dayMs / dailyMax) * 100;
                    const isToday = isSameDay(d, new Date());
                    return (
                      <div key={d.toISOString()} className="flex flex-col items-center gap-2">
                        <div className="h-24 w-full flex items-end">
                          <div
                            className="w-full rounded-lg transition-all"
                            style={{
                              height: `${Math.max(pct, dayMs > 0 ? 6 : 0)}%`,
                              background: dayMs > 0
                                ? `linear-gradient(180deg, hsl(${w.color}), hsl(${w.color} / 0.6))`
                                : "hsl(var(--muted))",
                              minHeight: dayMs > 0 ? 8 : 0,
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <p className={`text-xs ${isToday ? "font-semibold" : "text-muted-foreground"}`}>
                            {format(d, "EEE")}
                          </p>
                          <p className="text-xs tabular-nums">
                            {dayMs > 0 ? formatDuration(dayMs) : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-5 sm:p-6 grid lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      By client
                    </h4>
                    <div className="space-y-2">
                      {breakdown.map((b) => (
                        <div
                          key={b.customer?.id ?? b.name}
                          className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border"
                        >
                          <AvatarTile
                            name={b.customer?.name ?? b.name}
                            color={b.customer?.color ?? "0 0% 50%"}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {b.customer?.name ?? b.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {b.count} {b.count === 1 ? "session" : "sessions"}
                            </p>
                          </div>
                          <p className="text-sm font-medium tabular-nums">
                            {formatHours(b.ms)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Sessions
                    </h4>
                    <div className="rounded-xl border border-border overflow-hidden">
                      {wSessions
                        .slice()
                        .sort((a, b) => a.startAt - b.startAt)
                        .map((s, i) => {
                          return (
                            <div
                              key={s.id}
                              className={`flex items-center gap-3 p-3 ${i > 0 ? "border-t border-border" : ""}`}
                            >
                              <div className="text-xs text-muted-foreground w-16">
                                {format(new Date(s.startAt), "EEE")}
                                <br />
                                <span className="tabular-nums">
                                  {format(new Date(s.startAt), "MMM d")}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {s.customerName}
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  {fmtTime(s.startAt)} —{" "}
                                  {s.endAt ? fmtTime(s.endAt) : "active"}
                                </p>
                              </div>
                              <p className="text-sm font-medium tabular-nums">
                                {formatDuration(durationMs(s, now))}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-lg h-9 w-9"
                                onClick={() => setEditingId(s.id)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {weekSessions.length === 0 && (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-3xl">
            No sessions logged this week.
          </div>
        )}
      </div>

      <EditSessionDrawer
        sessionId={editingId}
        onClose={() => setEditingId(null)}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-3xl font-semibold mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}
