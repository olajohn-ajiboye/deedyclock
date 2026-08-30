import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, addYears, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MoneyInput } from "@/components/MoneyInput";
import { Button } from "@/components/ui/button";
import { fetchDailyCash, saveDailyCash } from "@/lib/cashCollections";
import {
  buildCashDayRows,
  getCashPeriodRange,
  type CashPeriod,
  type DailyCashEntry,
} from "@/lib/cashReconciliation";
import {
  buildPaymentReport,
  formatMoney,
  type AppointmentPaymentEdit,
  type SquarePaymentRecord,
} from "@/lib/paymentReport";
import { syncAppointmentPaymentCopies } from "@/lib/appointmentPayments";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const periodLabels: Record<CashPeriod, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

export function CashCollectedSection() {
  const customers = useStore((state) => state.customers);
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const [period, setPeriod] = useState<CashPeriod>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [appointments, setAppointments] = useState<SquarePaymentRecord[]>([]);
  const [edits, setEdits] = useState<Record<string, AppointmentPaymentEdit>>({});
  const [cashByDay, setCashByDay] = useState<Record<string, DailyCashEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const range = useMemo(() => getCashPeriodRange(period, anchor), [period, anchor]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSaveError(null);

    Promise.all([
      fetchSquareBookedAppointments(range, controller.signal).then(async (records) => {
        const stored = await syncAppointmentPaymentCopies(records, customersRef.current);
        return { records, stored };
      }),
      fetchDailyCash(range),
    ])
      .then(([loaded, cash]) => {
        if (controller.signal.aborted) return;
        setAppointments(loaded.records);
        setEdits(loaded.stored);
        setCashByDay(cash);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSaveError(error instanceof Error ? error.message : "Could not load cash collections");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [range]);

  const report = useMemo(
    () => buildPaymentReport(appointments, customers, "month", edits),
    [appointments, customers, edits],
  );
  const rows = useMemo(
    () => buildCashDayRows(report.items, cashByDay, period, range),
    [report.items, cashByDay, period, range],
  );

  const periodTitle =
    period === "year"
      ? format(anchor, "yyyy")
      : period === "day"
        ? format(anchor, "EEEE, MMMM d, yyyy")
        : period === "week"
          ? `${format(startOfWeek(anchor, { weekStartsOn: 1 }), "MMM d")} – ${format(
              addDays(startOfWeek(anchor, { weekStartsOn: 1 }), 6),
              "MMM d, yyyy",
            )}`
          : format(anchor, "MMMM yyyy");

  const movePeriod = (amount: number) => {
    setAnchor((current) => {
      if (period === "day") return addDays(current, amount);
      if (period === "week") return addDays(current, amount * 7);
      if (period === "year") return addYears(current, amount);
      return addMonths(current, amount);
    });
  };

  const commitEntry = async (dateKey: string, patch: Partial<DailyCashEntry>) => {
    const next: DailyCashEntry = {
      cashMinor: cashByDay[dateKey]?.cashMinor ?? 0,
      payoutMinor: cashByDay[dateKey]?.payoutMinor ?? 0,
      ...patch,
    };
    setCashByDay((current) => ({ ...current, [dateKey]: next }));
    setSaveError(null);
    try {
      await saveDailyCash(dateKey, next);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save cash collected");
    }
  };

  return (
    <section className="rounded-3xl bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border space-y-4">
        <div>
          <h3 className="font-display text-2xl font-semibold">Cash collected</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Enter cash and loctician payout on the day view. Week, month, and year show totals.
            Revenue is appointment cost plus tip plus product. Difference is revenue minus cash
            minus loctician payout.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex rounded-xl border border-border bg-muted/40 p-1">
            {(["day", "week", "month", "year"] as CashPeriod[]).map((value) => (
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
        </div>
        {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
      </div>

      {loading ? (
        <p className="p-12 text-center text-muted-foreground">Loading daily cash…</p>
      ) : rows.length === 0 ? (
        <p className="p-12 text-center text-muted-foreground">
          No revenue or cash recorded in this period.
        </p>
      ) : (
        <div>
          <div
            role="row"
            className="hidden sm:grid grid-cols-[minmax(8rem,1.1fr)_minmax(5.5rem,0.7fr)_minmax(6rem,0.7fr)_minmax(6.5rem,0.8fr)_minmax(5.5rem,0.7fr)] gap-4 px-6 py-3 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground"
          >
            <span role="columnheader">{period === "day" ? "Date" : "Period"}</span>
            <span role="columnheader" className="text-right">
              Revenue
            </span>
            <span role="columnheader" className="text-right">
              Cash
            </span>
            <span role="columnheader" className="text-right">
              Loctician payout
            </span>
            <span role="columnheader" className="text-right">
              Difference
            </span>
          </div>
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.dateKey}
                className="grid grid-cols-2 sm:grid-cols-[minmax(8rem,1.1fr)_minmax(5.5rem,0.7fr)_minmax(6rem,0.7fr)_minmax(6.5rem,0.8fr)_minmax(5.5rem,0.7fr)] gap-3 sm:gap-4 items-center p-4 sm:px-6"
              >
                <p className="font-medium col-span-2 sm:col-span-1">{row.label}</p>
                <p
                  className="text-right tabular-nums"
                  aria-label={`Revenue for ${row.label}`}
                >
                  {formatMoney(row.revenueMinor, report.currency)}
                </p>
                {row.cashEditable ? (
                  <div className="sm:justify-self-end w-full max-w-28 ml-auto">
                    <MoneyInput
                      valueMinor={row.cashMinor}
                      ariaLabel={`Cash for ${row.label}`}
                      className="h-9 px-2 text-right tabular-nums text-sm"
                      onCommit={(amountMinor) =>
                        void commitEntry(row.dateKey, { cashMinor: amountMinor })
                      }
                    />
                  </div>
                ) : (
                  <p className="text-right tabular-nums" aria-label={`Cash for ${row.label}`}>
                    {formatMoney(row.cashMinor, report.currency)}
                  </p>
                )}
                {row.cashEditable ? (
                  <div className="sm:justify-self-end w-full max-w-28 ml-auto">
                    <MoneyInput
                      valueMinor={row.payoutMinor}
                      ariaLabel={`Loctician payout for ${row.label}`}
                      className="h-9 px-2 text-right tabular-nums text-sm"
                      onCommit={(amountMinor) =>
                        void commitEntry(row.dateKey, { payoutMinor: amountMinor })
                      }
                    />
                  </div>
                ) : (
                  <p
                    className="text-right tabular-nums"
                    aria-label={`Loctician payout for ${row.label}`}
                  >
                    {formatMoney(row.payoutMinor, report.currency)}
                  </p>
                )}
                <p
                  className={cn(
                    "text-right font-medium tabular-nums col-span-2 sm:col-span-1",
                    row.differenceMinor < 0 ? "text-destructive" : "text-success",
                  )}
                  aria-label={`Difference for ${row.label}`}
                >
                  {formatMoney(row.differenceMinor, report.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
