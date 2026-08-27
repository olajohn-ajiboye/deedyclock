import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Square } from "lucide-react";
import { useStore, useNow, store } from "@/lib/store";
import { AvatarTile } from "@/components/AvatarTile";
import { EditSessionDrawer } from "@/components/EditSessionDrawer";
import { TodaysClients } from "@/components/TodaysClients";
import { TodaysSessions } from "@/components/TodaysSessions";
import {
  durationMs,
  formatDuration,
  fmtTime,
  weekRange,
} from "@/lib/time";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const allWorkers = useStore((s) => s.workers);
  const allCustomers = useStore((s) => s.customers);
  const allSessions = useStore((s) => s.sessions);
  const worker = allWorkers.find((w) => w.id === id);
  const customers = allCustomers.filter((c) => !c.archived);
  const sessions = allSessions
    .filter((x) => x.workerId === id)
    .sort((a, b) => b.startAt - a.startAt);
  const now = useNow();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!worker) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Loctician not found.</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          Back
        </Button>
      </div>
    );
  }

  const active = sessions.find((s) => s.endAt === null);
  const activeCustomerName = active?.customerName ?? null;

  const todayStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const { start: weekStart } = weekRange(new Date());

  const todayMs = sessions
    .filter((s) => s.startAt >= todayStart)
    .reduce((acc, s) => acc + durationMs(s, now), 0);
  const weekMs = sessions
    .filter((s) => s.startAt >= weekStart.getTime())
    .reduce((acc, s) => acc + durationMs(s, now), 0);

  const todaySessions = sessions.filter((s) => s.startAt >= todayStart);

  function handleStart(customer: { id: string; squareId?: string; name: string }) {
    if (active) {
      toast.error("End the current session first.");
      return;
    }
    store
      .startSession(worker!.id, { squareId: customer.squareId ?? null, name: customer.name })
      .then(() => toast.success(`Started session with ${customer.name}`))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to start"));
  }

  function handleEnd() {
    if (!active) return;
    const ms = durationMs(active, Date.now());
    store
      .endSession(active.id)
      .then(() =>
        toast.success(`Logged ${formatDuration(ms)} for ${activeCustomerName ?? "client"}`),
      )
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to end"));
  }

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> All locticians
      </Link>

      <header className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
        <div className="flex items-center gap-5">
          <AvatarTile name={worker.name} color={worker.color} size="xl" />
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-tight">
              {worker.name}
            </h2>
            <div className="flex gap-6 mt-2 text-sm">
              <div>
                <p className="text-muted-foreground">Today</p>
                <p className="font-medium tabular-nums text-base">
                  {formatDuration(todayMs)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">This week</p>
                <p className="font-medium tabular-nums text-base">
                  {formatDuration(weekMs)}
                </p>
              </div>
              {typeof worker.hourlyRate === "number" && worker.hourlyRate > 0 && (
                <div>
                  <p className="text-muted-foreground">Earned this week</p>
                  <p className="font-medium tabular-nums text-base">
                    ${((weekMs / 3_600_000) * worker.hourlyRate).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {active && activeCustomerName && (
        <section
          className="rounded-3xl p-8 text-primary-foreground shadow-[var(--shadow-elevated)] relative overflow-hidden"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="absolute inset-0 opacity-30 pointer-events-none"
               style={{ background: "radial-gradient(60% 80% at 80% 20%, hsl(var(--accent) / 0.45), transparent)" }} />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <p className="uppercase tracking-[0.2em] text-xs opacity-80">
                Now serving
              </p>
              <h3 className="font-display text-3xl font-semibold mt-1">
                {activeCustomerName}
              </h3>
              <p className="opacity-80 text-sm mt-1">
                Started at {fmtTime(active.startAt)}
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="font-display text-6xl font-semibold tabular-nums">
                {formatDuration(now - active.startAt, { withSeconds: true })}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleEnd}
              className="h-20 px-10 text-lg rounded-2xl bg-danger hover:bg-danger/90 text-danger-foreground"
            >
              <Square className="w-6 h-6 mr-2 fill-current" />
              End session
            </Button>
          </div>
        </section>
      )}

      {!active && <TodaysClients customers={customers} onStart={handleStart} />}

      <TodaysSessions
        sessions={todaySessions}
        customers={allCustomers}
        now={now}
        onEditSession={setEditingId}
      />

      <EditSessionDrawer
        sessionId={editingId}
        onClose={() => setEditingId(null)}
      />
    </div>
  );
}
