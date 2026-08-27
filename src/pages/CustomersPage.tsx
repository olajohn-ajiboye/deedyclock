import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { AvatarTile } from "@/components/AvatarTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, RefreshCw } from "lucide-react";
import { customerProfilePath } from "@/lib/customerHistory";
import { syncCustomersFromSquare } from "@/lib/squareSync";

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  const visible = customers
    .filter((c) => !c.archived)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncCustomersFromSquare();
    } catch {
      // toast handled in sync helper
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground mb-2">
            Clients · Two-way sync with Square
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Your client roster
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open a client to see notes, photos, and every past appointment.
          </p>
        </div>
        <div className="sm:ml-auto flex gap-2 w-full sm:w-auto">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-12 rounded-xl"
          />
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            className="h-12 rounded-xl px-5"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from Square"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((c) => {
          const cardClass =
            "group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
          const body = (
            <>
              <AvatarTile name={c.name} color={c.color} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                {c.phone && (
                  <p className="text-sm text-muted-foreground truncate">{c.phone}</p>
                )}
                {c.email && (
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                )}
              </div>
              {c.squareId ? (
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </>
          );
          return c.squareId ? (
            <Link key={c.id} to={customerProfilePath(c.squareId)} className={cardClass}>
              {body}
            </Link>
          ) : (
            <div key={c.id} className={cardClass}>
              {body}
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-16 border-2 border-dashed border-border rounded-2xl">
            {syncing ? "Syncing clients from Square…" : "No clients yet. Tap Sync from Square."}
          </div>
        )}
      </div>
    </div>
  );
}
