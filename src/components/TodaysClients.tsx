import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { customerProfilePath } from "@/lib/customerHistory";
import { AvatarTile } from "@/components/AvatarTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTodayBookings } from "@/lib/squareBookings";
import type { Customer } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TodaysClientsProps {
  customers: Customer[];
  onStart: (customer: { id: string; squareId?: string; name: string }) => void;
}

export function TodaysClients({ customers, onStart }: TodaysClientsProps) {
  const [search, setSearch] = useState("");
  const { bookings, loading, error } = useTodayBookings();
  const todaySquareIds = new Set(
    (bookings ?? []).map((booking) => booking.customerId).filter(Boolean),
  );
  const todaysCustomers = customers.filter(
    (customer) => customer.squareId && todaySquareIds.has(customer.squareId),
  );
  const filteredCustomers = search
    ? customers.filter((customer) =>
        customer.name.toLowerCase().includes(search.toLowerCase()),
      )
    : todaysCustomers;

  return (
    <section className="rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-[var(--shadow-card)]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-display text-2xl font-semibold">Today's clients</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {loading
              ? "Loading appointments…"
              : error
                ? "Could not load appointments from Square."
                : `${todaysCustomers.length} ${todaysCustomers.length === 1 ? "client" : "clients"} booked today — tap to start.`}
          </p>
        </div>
        <div className="sm:ml-auto relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search all clients"
            className="pl-9 h-12 rounded-xl"
          />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-background max-h-[480px] overflow-y-auto">
        {filteredCustomers.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            {loading
              ? "Loading appointments…"
              : error
                ? "Couldn't load today's appointments from Square."
                : search
                  ? "No clients match your search."
                  : "No appointments scheduled for today."}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr
                  key={customer.id}
                  onClick={() =>
                    onStart({
                      id: customer.id,
                      squareId: customer.squareId,
                      name: customer.name,
                    })
                  }
                  className={cn(
                    "cursor-pointer hover:bg-muted/40 transition-colors",
                    index > 0 && "border-t border-border",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarTile name={customer.name} color={customer.color} size="md" />
                      {customer.squareId ? (
                        <Link
                          to={customerProfilePath(customer.squareId)}
                          onClick={(event) => event.stopPropagation()}
                          className="font-medium hover:underline truncate"
                        >
                          {customer.name}
                        </Link>
                      ) : (
                        <span className="font-medium truncate">{customer.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onStart({
                          id: customer.id,
                          squareId: customer.squareId,
                          name: customer.name,
                        });
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
  );
}
