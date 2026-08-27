export type PaymentPeriod = "day" | "month" | "year";

export interface SquarePaymentRecord {
  id: string;
  customerId: string | null;
  createdAt: string;
  amountMinor: number;
  currency: string;
  serviceNames: string[];
  unpriced: boolean;
}

export interface PaymentRange {
  beginTime: string;
  endTime?: string;
}

interface CustomerReference {
  squareId?: string;
  name: string;
}

export interface AppointmentPaymentEdit {
  paidAmountMinor: number;
  tipAmountMinor: number;
}

export interface PaymentReportItem {
  id: string;
  customerId: string | null;
  customerName: string;
  createdAt: string;
  catalogAmountMinor: number;
  paidAmountMinor: number;
  tipAmountMinor: number;
  amountMinor: number;
  serviceNames: string[];
  unpriced: boolean;
}

export interface PaymentBucket {
  key: string;
  label: string;
  amountMinor: number;
  tipAmountMinor: number;
}

export interface PaymentReport {
  currency: string;
  totalAmountMinor: number;
  totalPaidMinor: number;
  totalTipMinor: number;
  paymentCount: number;
  customerCount: number;
  items: PaymentReportItem[];
  buckets: PaymentBucket[];
}

export function getPaymentRange(period: PaymentPeriod, anchor: Date): PaymentRange {
  if (period === "day") {
    const begin = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const end = new Date(begin);
    end.setDate(end.getDate() + 1);
    return { beginTime: begin.toISOString(), endTime: end.toISOString() };
  }

  if (period === "year") {
    const begin = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear() + 1, 0, 1);
    return { beginTime: begin.toISOString(), endTime: end.toISOString() };
  }

  const begin = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { beginTime: begin.toISOString(), endTime: end.toISOString() };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function bucketFor(payment: SquarePaymentRecord, period: PaymentPeriod): { key: string; label: string } {
  const date = new Date(payment.createdAt);
  if (period === "day") {
    const hour = date.getHours();
    return {
      key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(hour)}`,
      label: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date),
    };
  }
  if (period === "month") {
    return {
      key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date),
    };
  }
  return {
    key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
    label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
  };
}

export function customerNameFor(
  customerId: string | null,
  namesById: Map<string, string>,
): string {
  if (!customerId) return "Appointment without a customer";
  return namesById.get(customerId) ?? `Square customer ${customerId}`;
}

export function customerNamesById(
  customers: CustomerReference[],
): Map<string, string> {
  return new Map(
    customers
      .filter((customer) => customer.squareId)
      .map((customer) => [customer.squareId as string, customer.name]),
  );
}

export function buildPaymentReport(
  payments: SquarePaymentRecord[],
  customers: CustomerReference[],
  period: PaymentPeriod,
  edits: Record<string, AppointmentPaymentEdit> = {},
): PaymentReport {
  const currencies = new Set(payments.map((payment) => payment.currency));
  if (currencies.size > 1) {
    throw new Error("Cannot total Square appointments in multiple currencies");
  }

  const namesById = customerNamesById(customers);
  const bucketTotals = new Map<string, PaymentBucket>();
  let totalPaidMinor = 0;
  let totalTipMinor = 0;

  for (const payment of payments) {
    const paidAmountMinor = edits[payment.id]?.paidAmountMinor ?? payment.amountMinor;
    const tipAmountMinor = edits[payment.id]?.tipAmountMinor ?? 0;
    totalPaidMinor += paidAmountMinor;
    totalTipMinor += tipAmountMinor;

    const bucket = bucketFor(payment, period);
    const existingBucket = bucketTotals.get(bucket.key) ?? {
      ...bucket,
      amountMinor: 0,
      tipAmountMinor: 0,
    };
    existingBucket.amountMinor += paidAmountMinor;
    existingBucket.tipAmountMinor += tipAmountMinor;
    bucketTotals.set(bucket.key, existingBucket);
  }

  return {
    currency: payments[0]?.currency ?? "CAD",
    totalPaidMinor,
    totalTipMinor,
    totalAmountMinor: totalPaidMinor + totalTipMinor,
    paymentCount: payments.length,
    customerCount: new Set(
      payments
        .map((payment) => payment.customerId)
        .filter((customerId): customerId is string => customerId !== null),
    ).size,
    items: payments
      .map((payment) => {
        const paidAmountMinor = edits[payment.id]?.paidAmountMinor ?? payment.amountMinor;
        const tipAmountMinor = edits[payment.id]?.tipAmountMinor ?? 0;
        return {
          id: payment.id,
          customerId: payment.customerId,
          customerName: customerNameFor(payment.customerId, namesById),
          createdAt: payment.createdAt,
          catalogAmountMinor: payment.amountMinor,
          paidAmountMinor,
          tipAmountMinor,
          amountMinor: paidAmountMinor + tipAmountMinor,
          serviceNames: payment.serviceNames,
          unpriced: payment.unpriced,
        };
      })
      .sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      ),
    buckets: [...bucketTotals.values()].sort((a, b) => a.key.localeCompare(b.key)),
  };
}

export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function dollarsToMinor(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("invalid amount");
  }
  return Math.round(amount * 100);
}

export function minorToDollarInput(amountMinor: number): string {
  return String(amountMinor / 100);
}
