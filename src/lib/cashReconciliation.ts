import { addDays, addMonths, addYears, format, startOfWeek } from "date-fns";
import type { PaymentRange } from "@/lib/paymentReport";

export type CashPeriod = "day" | "week" | "month" | "year";

export interface DailyCashEntry {
  cashMinor: number;
  payoutMinor: number;
}

export interface CashDayRow {
  dateKey: string;
  label: string;
  revenueMinor: number;
  cashMinor: number;
  payoutMinor: number;
  differenceMinor: number;
  cashEditable: boolean;
}

export function getCashPeriodRange(period: CashPeriod, anchor: Date): PaymentRange {
  if (period === "day") {
    const begin = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    return { beginTime: begin.toISOString(), endTime: addDays(begin, 1).toISOString() };
  }
  if (period === "week") {
    const begin = startOfWeek(anchor, { weekStartsOn: 1 });
    return { beginTime: begin.toISOString(), endTime: addDays(begin, 7).toISOString() };
  }
  if (period === "year") {
    const begin = new Date(anchor.getFullYear(), 0, 1);
    return { beginTime: begin.toISOString(), endTime: addYears(begin, 1).toISOString() };
  }
  const begin = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  return { beginTime: begin.toISOString(), endTime: addMonths(begin, 1).toISOString() };
}

export function localDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function eachLocalDayKeys(begin: Date, end: Date): string[] {
  const keys: string[] = [];
  for (let day = new Date(begin); day < end; day = addDays(day, 1)) {
    keys.push(localDayKey(day));
  }
  return keys;
}

export function buildCashDayRows(
  items: Array<{
    createdAt: string;
    paidAmountMinor: number;
    tipAmountMinor: number;
    productAmountMinor: number;
  }>,
  cashByDay: Record<string, DailyCashEntry>,
  period: CashPeriod,
  range: PaymentRange,
): CashDayRow[] {
  const begin = new Date(range.beginTime);
  const end = new Date(range.endTime ?? addDays(begin, 1).toISOString());
  const revenueByDay: Record<string, number> = {};

  for (const item of items) {
    const key = localDayKey(new Date(item.createdAt));
    revenueByDay[key] =
      (revenueByDay[key] ?? 0) +
      item.paidAmountMinor +
      item.tipAmountMinor +
      item.productAmountMinor;
  }

  const dailyRows = eachLocalDayKeys(begin, end).map((dateKey) => {
    const revenueMinor = revenueByDay[dateKey] ?? 0;
    const cashMinor = cashByDay[dateKey]?.cashMinor ?? 0;
    const payoutMinor = cashByDay[dateKey]?.payoutMinor ?? 0;
    return {
      dateKey,
      label: format(new Date(`${dateKey}T12:00:00`), "EEE, MMM d"),
      revenueMinor,
      cashMinor,
      payoutMinor,
      differenceMinor: revenueMinor - cashMinor - payoutMinor,
      cashEditable: true,
    };
  });

  if (period === "day") {
    return dailyRows;
  }

  const revenueMinor = dailyRows.reduce((sum, row) => sum + row.revenueMinor, 0);
  const cashMinor = dailyRows.reduce((sum, row) => sum + row.cashMinor, 0);
  const payoutMinor = dailyRows.reduce((sum, row) => sum + row.payoutMinor, 0);
  const startKey = localDayKey(begin);

  return [
    {
      dateKey: `${period}:${startKey}`,
      label: aggregateLabel(period, begin, end),
      revenueMinor,
      cashMinor,
      payoutMinor,
      differenceMinor: revenueMinor - cashMinor - payoutMinor,
      cashEditable: false,
    },
  ];
}

function aggregateLabel(period: CashPeriod, begin: Date, end: Date): string {
  if (period === "week") {
    return `${format(begin, "MMM d")} – ${format(addDays(end, -1), "MMM d, yyyy")}`;
  }
  if (period === "year") {
    return format(begin, "yyyy");
  }
  return format(begin, "MMMM yyyy");
}
