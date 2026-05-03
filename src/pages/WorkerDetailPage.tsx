import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Square, Search } from "lucide-react";
import { useStore, useNow, store } from "@/lib/store";
import { AvatarTile } from "@/components/AvatarTile";
import { EditSessionDrawer } from "@/components/EditSessionDrawer";
import {
  durationMs,
  formatDuration,
  fmtTime,
  weekRange,
} from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTodayBookings } from "@/lib/squareBookings";

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
  const [search, setSearch] = useState("");
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

  const { bookings, loading: bookingsLoading, error: bookingsError } = useTodayBookings();
  const todaySquareIds = new Set(
    (bookings ?? []).map((b) => b.customerId).filter(Boolean),
  );
  const todaysCustomers = customers.filter(
    (c) => c.squareId && todaySquareIds.has(c.squareId),
  );
  const filteredCustomers = todaysCustomers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

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

      {!active && (
        <section className="rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-[var(--shadow-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div>
              <h3 className="font-display text-2xl font-semibold">
                Today's clients
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                {bookingsLoading
                  ? "Loading appointments…"
                  : bookingsError
                    ? "Could not load appointments from Square."
                    : `${todaysCustomers.length} ${todaysCustomers.length === 1 ? "client" : "clients"} booked today — tap to start.`}
              </p>
            </div>
            <div className="sm:ml-auto relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search today's clients"
                className="pl-9 h-12 rounded-xl"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background overflow-hidden max-h-[480px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                {bookingsLoading
                  ? "Loading appointments…"
                  : bookingsError
                    ? "Couldn't load today's appointments from Square."
                    : todaysCustomers.length === 0
                      ? "No appointments scheduled for today."
                      : "No clients match your search."}
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => handleStart({ id: c.id, squareId: c.squareId, name: c.name })}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40 transition-colors",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AvatarTile name={c.name} color={c.color} size="md" />
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {c.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStart({ id: c.id, squareId: c.squareId, name: c.name });
                          }}
                          className="h-11 rounded-xl"
                        >
                          Start
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline gap-3 mb-4">
          <h3 className="font-display text-2xl font-semibold">Today's sessions</h3>
          <span className="text-sm text-muted-foreground">
            {todaySessions.length} {todaySessions.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {todaySessions.length === 0 && (
            <div className="p-10 text-center text-muted-foreground">
              No sessions yet today.
            </div>
          )}
          {todaySessions.map((s, i) => {
            const c = s.customerSquareId
              ? allCustomers.find((x) => x.squareId === s.customerSquareId)
              : null;
            const name = c?.name ?? s.customerName;
            const color = c?.color ?? "0 0% 50%";
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-4 p-4 sm:p-5",
                  i > 0 && "border-t border-border",
                  s.endAt === null && "bg-success/5",
                )}
              >
                <AvatarTile name={name} color={color} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {name}
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {fmtTime(s.startAt)} —{" "}
                    {s.endAt ? fmtTime(s.endAt) : <span className="text-success">in progress</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-semibold tabular-nums">
                    {formatDuration(durationMs(s, now))}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingId(s.id)}
                  className="rounded-xl h-12 w-12"
                  aria-label="Edit session"
                >
                  <Pencil className="w-5 h-5" />
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <EditSessionDrawer
        sessionId={editingId}
        onClose={() => setEditingId(null)}
      />
    </div>
  );
}
