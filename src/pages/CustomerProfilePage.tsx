import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { AppointmentImages } from "@/components/AppointmentImages";
import { CustomerNoteField } from "@/components/CustomerNoteField";
import { useStore } from "@/lib/store";
import { appointmentsForCustomer } from "@/lib/customerHistory";
import { syncAppointmentPaymentCopies } from "@/lib/appointmentPayments";
import {
  buildPaymentReport,
  formatMoney,
  getPaymentRange,
  type AppointmentPaymentEdit,
  type SquarePaymentRecord,
} from "@/lib/paymentReport";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";

export default function CustomerProfilePage() {
  const { squareId: rawSquareId } = useParams<{ squareId: string }>();
  const squareId = rawSquareId ? decodeURIComponent(rawSquareId) : "";
  const customers = useStore((state) => state.customers);
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const customer = customers.find((item) => item.squareId === squareId);

  const [appointments, setAppointments] = useState<SquarePaymentRecord[]>([]);
  const [edits, setEdits] = useState<Record<string, AppointmentPaymentEdit>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yearRanges = useMemo(() => {
    const now = new Date();
    return [0, 1, 2, 3, 4].map((yearsAgo) => {
      const anchor = new Date(now);
      anchor.setFullYear(now.getFullYear() - yearsAgo);
      return getPaymentRange("year", anchor);
    });
  }, []);

  useEffect(() => {
    if (!squareId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all(yearRanges.map((range) => fetchSquareBookedAppointments(range, controller.signal)))
      .then(async (pages) => {
        const byId = new Map<string, SquarePaymentRecord>();
        for (const records of pages) {
          for (const record of records) byId.set(record.id, record);
        }
        const records = [...byId.values()];
        const stored = await syncAppointmentPaymentCopies(records, customersRef.current);
        if (controller.signal.aborted) return;
        setAppointments(records);
        setEdits(stored);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Could not load visits");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [yearRanges, squareId]);

  const visits = useMemo(
    () => appointmentsForCustomer(appointments, squareId),
    [appointments, squareId],
  );
  const report = useMemo(
    () => buildPaymentReport(visits, customers, "year", edits),
    [visits, customers, edits],
  );

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Client not found.</p>
        <Link to="/customers" className="mt-4 inline-flex text-sm text-primary hover:underline">
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        to="/customers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Clients
      </Link>

      <section
        className="relative overflow-hidden rounded-[2rem] p-6 sm:p-8 text-primary-foreground shadow-[var(--shadow-elevated)]"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div
          className="absolute inset-0 opacity-35 pointer-events-none"
          style={{
            background:
              "radial-gradient(70% 90% at 90% 10%, hsl(var(--accent) / 0.55), transparent 55%)",
          }}
        />
        <div className="relative space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight leading-tight min-w-0 truncate">
              {customer.name}
            </h2>
            <p className="text-sm sm:text-base opacity-90 tabular-nums shrink-0">
              {customer.phone ?? "—"}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] opacity-75">Visits</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold tabular-nums">
                {loading ? "—" : report.paymentCount}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] opacity-75">Paid</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold tabular-nums">
                {loading ? "—" : formatMoney(report.totalPaidMinor, report.currency)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-card border border-border p-6 sm:p-8 shadow-[var(--shadow-card)]">
        <CustomerNoteField customer={customer} showTitle />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Visit history</p>
            <h3 className="font-display text-2xl font-semibold mt-1">Past appointments</h3>
          </div>
          <CalendarRange className="h-5 w-5 text-muted-foreground" />
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-muted-foreground py-10 text-center">Loading visits…</p>
        ) : visits.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-border py-14 text-center text-muted-foreground">
            No booked appointments yet for this client.
          </div>
        ) : (
          <ol className="space-y-4">
            {report.items.map((visit) => (
              <li
                key={visit.id}
                className="rounded-[1.75rem] bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-40 shrink-0 bg-muted/50 px-5 py-4 sm:py-6 border-b sm:border-b-0 sm:border-r border-border">
                    <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium">
                      {format(new Date(visit.createdAt), "MMM")}
                    </p>
                    <p className="font-display text-3xl font-semibold leading-none mt-1">
                      {format(new Date(visit.createdAt), "d")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {format(new Date(visit.createdAt), "yyyy")}
                    </p>
                    <p className="text-sm tabular-nums mt-3">
                      {format(new Date(visit.createdAt), "h:mm a")}
                    </p>
                  </div>
                  <div className="flex-1 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-medium text-lg">{visit.serviceNames.join(", ")}</p>
                      <div className="text-right">
                        <p className="font-display text-2xl font-semibold tabular-nums">
                          {formatMoney(visit.paidAmountMinor, report.currency)}
                        </p>
                        {visit.tipAmountMinor > 0 ? (
                          <p className="text-sm text-muted-foreground tabular-nums">
                            tips {formatMoney(visit.tipAmountMinor, report.currency)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <AppointmentImages
                      appointmentKey={visit.id}
                      customerName={customer.name}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
