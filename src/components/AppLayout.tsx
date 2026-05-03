import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Clock3, Users, UserRound, BarChart3, LogOut } from "lucide-react";
import { useStore, useNow, loadFromCloud, clearCloudCache } from "@/lib/store";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAuth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { syncCustomersFromSquare } from "@/lib/squareSync";
import { toast } from "sonner";

const tabs = [
  { to: "/", label: "Clock In", icon: Clock3, end: true },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/workers", label: "Locticians", icon: UserRound },
  { to: "/report", label: "Weekly", icon: BarChart3 },
];

export default function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const sessions = useStore((s) => s.sessions);
  const workers = useStore((s) => s.workers);
  const dataLoaded = useStore((s) => s.loaded);
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    if (!user) {
      clearCloudCache();
      return;
    }
    setBootstrapping(true);
    Promise.all([
      loadFromCloud().catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load data");
      }),
      syncCustomersFromSquare({ silent: true }).catch(() => {}),
    ]).finally(() => setBootstrapping(false));
  }, [user]);

  const active = sessions
    .filter((x) => x.endAt === null)
    .map((x) => ({
      session: x,
      worker: workers.find((w) => w.id === x.workerId),
      customerName: x.customerName,
    }));
  const now = useNow();
  const location = useLocation();

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/75 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl grid place-items-center text-primary-foreground font-display font-semibold text-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              DD
            </div>
            <div className="leading-tight">
              <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">Deedy Clock</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">
                {active.length === 0 ? "Quiet floor — no one on the clock" : `${active.length} on the clock`}
              </p>
            </div>
          </div>

          <nav className="ml-auto flex items-center gap-1 bg-muted/60 p-1 rounded-2xl">
            {tabs.map(({ to, label, icon: Icon, end }) => {
              const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={cn(
                    "flex items-center gap-2 px-3 sm:px-4 h-11 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-[var(--shadow-card)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-11 w-11"
            onClick={() => signOut()}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {active.length > 0 && (
          <div className="border-t border-border/60 bg-success/5">
            <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-2 flex gap-3 overflow-x-auto">
              {active.map(({ session, worker, customerName }) => (
                <div
                  key={session.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border text-sm whitespace-nowrap"
                >
                  <span className="relative inline-flex items-center justify-center w-2.5 h-2.5">
                    <span className="absolute inset-0 rounded-full bg-success animate-soft-pulse" />
                  </span>
                  <span className="font-medium">{worker?.name ?? "—"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{customerName ?? "—"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="tabular-nums font-medium text-success">
                    {formatDuration(now - session.startAt, { withSeconds: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-5 sm:px-8 py-6 sm:py-10">
        {bootstrapping && !dataLoaded ? (
          <div className="text-center text-muted-foreground py-20">Loading…</div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
