/** Square ListBookings rejects start_at ranges longer than 31 days. */
const SQUARE_BOOKING_MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

export function squareBookingSearchWindows(
  beginTime: string,
  endTime: string,
): { beginTime: string; endTime: string }[] {
  const beginMs = Date.parse(beginTime);
  const endMs = Date.parse(endTime);
  if (!Number.isFinite(beginMs) || !Number.isFinite(endMs) || beginMs >= endMs) {
    throw new Error("beginTime must be before endTime");
  }

  const windows: { beginTime: string; endTime: string }[] = [];
  let windowStart = beginMs;
  while (windowStart < endMs) {
    const windowEnd = Math.min(windowStart + SQUARE_BOOKING_MAX_RANGE_MS, endMs);
    windows.push({
      beginTime: new Date(windowStart).toISOString(),
      endTime: new Date(windowEnd).toISOString(),
    });
    windowStart = windowEnd;
  }
  return windows;
}

export interface SquarePaymentRecord {
  id: string;
  customerId: string | null;
  createdAt: string;
  amountMinor: number;
  currency: string;
  serviceNames: string[];
  unpriced: boolean;
}

export interface CatalogServicePrice {
  amount: number;
  currency: string | null;
  name: string;
  unpriced: boolean;
}

type UnknownRecord = Record<string, unknown>;

const SKIPPED_BOOKING_STATUSES = new Set([
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_SELLER",
  "DECLINED",
  "NO_SHOW",
]);

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Booked appointment is missing ${field}`);
  }
  return value;
}

function catalogPriceFor(
  serviceVariationId: string,
  catalog: Map<string, CatalogServicePrice>,
): CatalogServicePrice {
  const price = catalog.get(serviceVariationId);
  if (!price) {
    return {
      amount: 0,
      currency: null,
      name: "No catalog price",
      unpriced: true,
    };
  }
  if (price.unpriced) return price;
  if (!Number.isSafeInteger(price.amount) || price.amount < 0) {
    throw new Error(`Booked appointment has invalid catalog price for ${serviceVariationId}`);
  }
  if (typeof price.currency !== "string" || price.currency === "") {
    throw new Error(`Booked appointment has invalid catalog currency for ${serviceVariationId}`);
  }
  return price;
}

export function collectServiceVariationIds(bookings: unknown[]): string[] {
  const ids = new Set<string>();
  for (const booking of bookings) {
    if (!booking || typeof booking !== "object") continue;
    const segments = (booking as UnknownRecord).appointment_segments;
    if (!Array.isArray(segments)) continue;
    for (const segment of segments) {
      if (!segment || typeof segment !== "object") continue;
      const serviceVariationId = (segment as UnknownRecord).service_variation_id;
      if (typeof serviceVariationId === "string" && serviceVariationId !== "") {
        ids.add(serviceVariationId);
      }
    }
  }
  return [...ids];
}

export function catalogPriceFromObject(value: unknown): CatalogServicePrice | null {
  if (!value || typeof value !== "object") return null;
  const catalogObject = value as UnknownRecord;
  const id = catalogObject.id;
  if (typeof id !== "string" || id === "") return null;

  const variation = catalogObject.item_variation_data;
  if (!variation || typeof variation !== "object") return null;
  const variationData = variation as UnknownRecord;
  const name =
    typeof variationData.name === "string" && variationData.name !== ""
      ? variationData.name
      : id;
  const priceMoney = variationData.price_money;
  if (!priceMoney || typeof priceMoney !== "object") {
    return { amount: 0, currency: null, name, unpriced: true };
  }

  const amount = (priceMoney as UnknownRecord).amount;
  const currency = (priceMoney as UnknownRecord).currency;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`Catalog service ${id} has an invalid price`);
  }
  if (typeof currency !== "string" || currency === "") {
    throw new Error(`Catalog service ${id} has an invalid currency`);
  }

  return { amount, currency, name, unpriced: false };
}

export function normalizeSquareBooking(
  value: unknown,
  catalog: Map<string, CatalogServicePrice>,
): SquarePaymentRecord | null {
  if (!value || typeof value !== "object") return null;
  const booking = value as UnknownRecord;
  if (typeof booking.status === "string" && SKIPPED_BOOKING_STATUSES.has(booking.status)) {
    return null;
  }

  const id = requiredString(booking.id, "id");
  const createdAt = requiredString(booking.start_at, "start_at");
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new Error(`Booked appointment ${id} has invalid start_at`);
  }

  if (!Array.isArray(booking.appointment_segments) || booking.appointment_segments.length === 0) {
    throw new Error(`Booked appointment ${id} has no appointment segments`);
  }

  let amountMinor = 0;
  let currency: string | null = null;
  let unpriced = false;
  const serviceNames: string[] = [];

  for (const segment of booking.appointment_segments) {
    if (!segment || typeof segment !== "object") {
      throw new Error(`Booked appointment ${id} has an invalid appointment segment`);
    }
    const serviceVariationId = requiredString(
      (segment as UnknownRecord).service_variation_id,
      "service_variation_id",
    );
    const price = catalogPriceFor(serviceVariationId, catalog);
    if (price.unpriced) {
      unpriced = true;
      serviceNames.push(price.name);
      continue;
    }
    if (currency && price.currency !== currency) {
      throw new Error(`Booked appointment ${id} mixes catalog currencies`);
    }
    currency = price.currency;
    amountMinor += price.amount;
    serviceNames.push(price.name);
  }

  return {
    id,
    customerId:
      typeof booking.customer_id === "string" && booking.customer_id !== ""
        ? booking.customer_id
        : null,
    createdAt,
    amountMinor,
    currency: currency ?? "CAD",
    serviceNames,
    unpriced,
  };
}
