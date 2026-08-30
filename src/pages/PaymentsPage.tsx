import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, addMonths, addYears, format } from "date-fns";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AvatarTile } from "@/components/AvatarTile";
import { CashCollectedSection } from "@/components/CashCollectedSection";
import { customerProfilePath } from "@/lib/customerHistory";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { syncAppointmentPaymentCopies } from "@/lib/appointmentPayments";
import {
  buildPaymentReport,
  formatMoney,
  getPaymentRange,
  type AppointmentPaymentEdit,
  type ChartScale,
  type PaymentPeriod,
  type SquarePaymentRecord,
} from "@/lib/paymentReport";
import { completedAppointmentIds } from "@/lib/sessionAppointments";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";

const periodLabels: Record<PaymentPeriod, string> = {
  day: "Day",
  month: "Month",
  year: "Year",
};

export default function PaymentsPage() {
  const customers = useStore((state) => state.customers);
  const sessions = useStore((state) => state.sessions);
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const [period, setPeriod] = useState<PaymentPeriod>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [appointments, setAppointments] = useState<SquarePaymentRecord[]>([]);
  const [edits, setEdits] = useState<Record<string, AppointmentPaymentEdit>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [chartScale, setChartScale] = useState<ChartScale>("week");

  const range = useMemo(
    () => getPaymentRange(period, anchor),
    [period, anchor],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFetchError(null);
    setAppointments([]);
    setEdits({});

    fetchSquareBookedAppointments(range, controller.signal)
      .then(async (records) => {
        const stored = await syncAppointmentPaymentCopies(records, customersRef.current);
        if (controller.signal.aborted) return;
        setAppointments(records);
        setEdits(stored);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFetchError(
          error instanceof Error ? error.message : "Failed to load Square appointments",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [range, refreshKey]);

  const completedIds = useMemo(
    () => completedAppointmentIds(sessions, appointments),
    [sessions, appointments],
  );

  const reportResult = useMemo(() => {
    try {
      return {
        report: buildPaymentReport(
          appointments,
          customers,
          period,
          edits,
          completedIds,
          chartScale,
        ),
        error: null,
      };
    } catch (error) {
      return {
        report: null,
        error: error instanceof Error ? error.message : "Appointment totals are invalid",
      };
    }
  }, [appointments, customers, period, edits, completedIds, chartScale]);

  const report = reportResult.report;
  const error = fetchError ?? reportResult.error;
  const maxBucketAmount = Math.max(
    1,
    ...(report?.buckets.map(bucketTotalMinor) ?? []),
  );

  const periodTitle =
    period === "year"
      ? format(anchor, "yyyy")
      : period === "day"
        ? format(anchor, "EEEE, MMMM d, yyyy")
        : format(anchor, "MMMM yyyy");

  const movePeriod = (amount: number) => {
    setAnchor((current) => {
      if (period === "day") return addDays(current, amount);
      if (period === "year") return addYears(current, amount);
      return addMonths(current, amount);
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div>
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground mb-2">
            Square booked appointments
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Booked appointment totals
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cost, appointments, and customers show completed sessions over booked Square
            appointments. Completed is income already clocked; booked is still on the calendar.
            Service cost, tips, and product sales are entered from sessions and kept separate for
            accounting. Cancelled, declined, and no-show appointments are excluded.
          </p>
        </div>

        <div className="lg:ml-auto flex flex-wrap gap-2">
          <div className="flex rounded-xl border border-border bg-muted/40 p-1">
            {(["day", "month", "year"] as PaymentPeriod[]).map((value) => (
              <Button
                key={value}
                variant={period === value ? "secondary" : "ghost"}
                className="rounded-lg"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
              >
                {periodLabels[value]}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
            aria-label="Refresh Square appointments"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={() => movePeriod(-1)}
          aria-label={`Previous ${period}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="min-w-36 px-3 text-center font-medium">{periodTitle}</p>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={() => movePeriod(1)}
          aria-label={`Next ${period}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <p className="font-medium text-destructive">Appointment totals could not be loaded.</p>
          <p className="mt-1 text-sm text-muted-foreground break-words">{error}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Try again
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Cost"
          value={
            report ? (
              <CompletedBookedValue
                completed={formatMoney(report.completedPaidMinor, report.currency)}
                booked={formatMoney(report.totalPaidMinor, report.currency)}
              />
            ) : (
              "—"
            )
          }
          hint="completed / booked"
          ariaLabel="Cost total"
        />
        <SummaryCard
          label="Tips"
          value={report ? formatMoney(report.totalTipMinor, report.currency) : "—"}
          ariaLabel="Tips total"
        />
        <SummaryCard
          label="Product"
          value={report ? formatMoney(report.totalProductMinor, report.currency) : "—"}
          ariaLabel="Product total"
        />
        <SummaryCard
          label="Appointments"
          value={
            report ? (
              <CompletedBookedValue
                completed={String(report.completedPaymentCount)}
                booked={String(report.paymentCount)}
              />
            ) : (
              "—"
            )
          }
          hint="completed / booked"
          ariaLabel="Appointments total"
        />
        <SummaryCard
          label="Customers"
          value={
            report ? (
              <CompletedBookedValue
                completed={String(report.completedCustomerCount)}
                booked={String(report.customerCount)}
              />
            ) : (
              "—"
            )
          }
          hint="completed / booked"
          ariaLabel="Customers total"
        />
      </div>

      {report?.items.some((item) => item.unpriced) ? (
        <p className="text-sm text-muted-foreground">
          Some booked services have no Square catalog price (variable pricing). Those amounts start
          at zero until you enter a paid price on today's sessions.
        </p>
      ) : null}

      <section className="rounded-3xl bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-border flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-display text-2xl font-semibold">Booked over time</h3>
          <div className="flex flex-wrap items-center gap-3">
            {period === "month" ? (
              <div className="flex rounded-xl border border-border bg-muted/40 p-1">
                {(["week", "day"] as ChartScale[]).map((scale) => (
                  <Button
                    key={scale}
                    variant={chartScale === scale ? "secondary" : "ghost"}
                    className="rounded-lg h-8 px-3"
                    aria-pressed={chartScale === scale}
                    onClick={() => setChartScale(scale)}
                  >
                    {scale === "week" ? "Weekly" : "Daily"}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                Cost
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                Tip
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--primary-glow))]" />
                Product
              </span>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">
              Loading booked appointments from Square…
            </p>
          ) : report && report.buckets.length > 0 ? (
            <div className="flex items-end gap-1 min-h-48 overflow-x-auto">
              {report.buckets.map((bucket) => {
                const totalMinor = bucketTotalMinor(bucket);
                return (
                  <div
                    key={bucket.key}
                    className="flex min-w-8 flex-1 flex-col items-center gap-1"
                  >
                    <div className="h-40 w-full pt-6 flex items-end">
                      <div
                        className="relative w-full flex flex-col-reverse overflow-visible"
                        style={{
                          height: `${Math.max(8, (totalMinor / maxBucketAmount) * 100)}%`,
                        }}
                      >
                        <p className="absolute left-0 right-0 bottom-full pb-[5px] text-center text-[10px] font-medium tabular-nums leading-none">
                          {formatChartNumber(totalMinor)}
                        </p>
                        <div className="flex h-full w-full flex-col-reverse overflow-hidden">
                          <StackedSegment
                            amountMinor={bucket.amountMinor}
                            className="bg-primary text-white"
                            label="Cost"
                          />
                          <StackedSegment
                            amountMinor={bucket.tipAmountMinor}
                            className="bg-accent text-white"
                            label="Tip"
                          />
                          <StackedSegment
                            amountMinor={bucket.productAmountMinor}
                            className="bg-[hsl(var(--primary-glow))] text-white"
                            label="Product"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-none text-center whitespace-nowrap">
                      {bucket.label}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              No booked Square appointments in this period.
            </p>
          )}
        </div>
      </section>

      <CashCollectedSection />

      <section className="rounded-3xl bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-border">
          <h3 className="font-display text-2xl font-semibold">Appointments</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Stored service cost, tips, and product sales for every booked appointment in this
            period, newest first.
          </p>
        </div>
        {!loading && report && report.items.length > 0 ? (
          <div>
            <div
              role="row"
              className="hidden sm:grid grid-cols-[minmax(7rem,0.7fr)_minmax(11rem,1.3fr)_minmax(5.5rem,0.45fr)_minmax(5.5rem,0.45fr)_minmax(5.5rem,0.45fr)] gap-4 px-6 py-3 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground"
            >
              <span role="columnheader">Date</span>
              <span role="columnheader">Customer</span>
              <span role="columnheader" className="text-right">Cost</span>
              <span role="columnheader" className="text-right">Tip</span>
              <span role="columnheader" className="text-right">Product</span>
            </div>
            <div className="divide-y divide-border">
              {report.items.map((appointment) => (
                <div
                  key={appointment.id}
                  className="grid grid-cols-2 sm:grid-cols-[minmax(7rem,0.7fr)_minmax(11rem,1.3fr)_minmax(5.5rem,0.45fr)_minmax(5.5rem,0.45fr)_minmax(5.5rem,0.45fr)] gap-3 sm:gap-4 items-center p-4 sm:px-6"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(appointment.createdAt), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointment.createdAt), "h:mm a")}
                    </p>
                  </div>
                  <div className="sm:order-none order-first col-span-2 sm:col-span-1 flex items-center gap-3 min-w-0">
                    <AvatarTile
                      name={appointment.customerName}
                      color="220 70% 50%"
                      size="sm"
                    />
                    <div className="min-w-0">
                      {appointment.customerId ? (
                        <Link
                          to={customerProfilePath(appointment.customerId)}
                          className="font-medium truncate block hover:underline"
                        >
                          {appointment.customerName}
                        </Link>
                      ) : (
                        <p className="font-medium truncate">{appointment.customerName}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {appointment.serviceNames.join(", ")}
                        {appointment.unpriced ? " · catalog price missing" : ""}
                      </p>
                    </div>
                  </div>
                  <p
                    className="text-right font-display text-xl font-semibold tabular-nums"
                    role="status"
                    aria-label={`Cost for ${appointment.customerName}`}
                  >
                    {formatMoney(appointment.paidAmountMinor, report.currency)}
                    {appointment.unpriced && appointment.paidAmountMinor === 0 ? "*" : ""}
                  </p>
                  <p
                    className="text-right font-medium tabular-nums text-muted-foreground"
                    role="status"
                    aria-label={`Tip for ${appointment.customerName}`}
                  >
                    {formatMoney(appointment.tipAmountMinor, report.currency)}
                  </p>
                  <p
                    className="text-right font-medium tabular-nums text-muted-foreground"
                    role="status"
                    aria-label={`Product for ${appointment.customerName}`}
                  >
                    {formatMoney(appointment.productAmountMinor, report.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : !loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <CalendarCheck className="h-8 w-8 mx-auto mb-3 opacity-50" />
            No booked appointments in this period.
          </div>
        ) : null}
      </section>
    </div>
  );
}

function bucketTotalMinor(bucket: {
  amountMinor: number;
  tipAmountMinor: number;
  productAmountMinor: number;
}): number {
  return bucket.amountMinor + bucket.tipAmountMinor + bucket.productAmountMinor;
}

function formatChartNumber(amountMinor: number): string {
  return `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    amountMinor / 100,
  )}`;
}

function StackedSegment({
  amountMinor,
  className,
  label,
}: {
  amountMinor: number;
  className: string;
  label: string;
}) {
  if (amountMinor <= 0) return null;
  return (
    <div
      className={`relative grid place-items-center min-h-4 ${className}`}
      style={{ flexGrow: amountMinor, flexBasis: 0 }}
      aria-label={`${label} ${formatChartNumber(amountMinor)}`}
    >
      <span className="text-[10px] font-medium tabular-nums leading-none px-0.5">
        {formatChartNumber(amountMinor)}
      </span>
    </div>
  );
}

function CompletedBookedValue({
  completed,
  booked,
}: {
  completed: string;
  booked: string;
}) {
  return (
    <>
      <span className="text-success">{completed}</span>
      <span> / {booked}</span>
    </>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  ariaLabel,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]"
      aria-label={ariaLabel}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p
        className="font-display text-xl font-semibold mt-1 tabular-nums"
        role={ariaLabel ? "status" : undefined}
        aria-label={ariaLabel}
      >
        {value}
      </p>
      {hint ? (
        <p className="text-xs mt-1">
          <span className="text-success">completed</span>
          {" / booked"}
        </p>
      ) : null}
    </div>
  );
}
