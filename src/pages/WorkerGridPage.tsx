import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore, useNow } from "@/lib/store";
import { AvatarTile } from "@/components/AvatarTile";
import { durationMs, formatDuration } from "@/lib/time";
import { ArrowRight, Sparkles } from "lucide-react";

export default function WorkerGridPage() {
  const allWorkers = useStore((s) => s.workers);
  const sessions = useStore((s) => s.sessions);
  const workers = allWorkers.filter((w) => !w.archived);
  const customers = useStore((s) => s.customers);
  const now = useNow();

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  return (
    <div className="space-y-8">
      <section className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
        <div>
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground mb-2">
            Welcome to the floor
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Tap your name to clock in.
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Pick the customer you're starting with. We'll handle the timer.
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 px-4 h-12 rounded-full bg-card border border-border text-sm shadow-[var(--shadow-card)]">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-muted-foreground">
            {workers.length} stylists · {customers.filter((c) => !c.archived).length} clients
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {workers.map((w) => {
          const active = sessions.find(
            (s) => s.workerId === w.id && s.endAt === null,
          );
          const activeCustomer = active
            ? customers.find((c) => c.id === active.customerId)
            : null;
          const todayMs = sessions
            .filter((s) => s.workerId === w.id && s.startAt >= todayStart)
            .reduce((acc, s) => acc + durationMs(s, now), 0);

          return (
            <Link
              key={w.id}
              to={`/worker/${w.id}`}
              className="group relative overflow-hidden rounded-3xl bg-card border border-border p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow min-h-[200px] flex flex-col"
            >
              {active && (
                <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-xs font-medium text-success">
                  <span className="relative inline-flex items-center justify-center w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-success animate-soft-pulse" />
                  </span>
                  On the clock
                </span>
              )}
              <AvatarTile name={w.name} color={w.color} size="xl" />
              <h3 className="font-display text-xl font-semibold mt-4">{w.name}</h3>

              <div className="mt-auto pt-4 flex items-end justify-between">
                <div className="text-sm">
                  <p className="text-muted-foreground">Today</p>
                  <p className="font-medium tabular-nums">
                    {formatDuration(todayMs)}
                  </p>
                  {active && activeCustomer && (
                    <p className="text-xs text-success mt-1">
                      with {activeCustomer.name}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}

        <Link
          to="/workers"
          className="rounded-3xl border-2 border-dashed border-border p-6 min-h-[200px] grid place-items-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <div className="text-center">
            <div className="text-3xl font-display mb-1">+</div>
            <div className="text-sm font-medium">Add stylist</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
