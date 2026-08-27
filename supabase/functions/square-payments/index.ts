import {
  collectServiceVariationIds,
  catalogPriceFromObject,
  normalizeSquareBooking,
  squareBookingSearchWindows,
  type CatalogServicePrice,
  type SquarePaymentRecord,
} from "../_shared/paymentReport.ts";
import { corsHeaders, SQUARE_BASE } from "../_shared/square.ts";

const squareHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Square-Version": "2024-10-17",
  "Content-Type": "application/json",
});

async function squareJson(
  url: URL,
  token: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...squareHeaders(token),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Square API error (${response.status}): ${JSON.stringify(body)}`);
  }
  if (!body || typeof body !== "object") {
    throw new Error("Square API returned an invalid response");
  }
  return body as Record<string, unknown>;
}

async function listBookings(
  token: string,
  beginTime: string,
  endTime: string,
): Promise<unknown[]> {
  const bookings: unknown[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < 1_000; page += 1) {
    const url = new URL(`${SQUARE_BASE}/bookings`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("start_at_min", beginTime);
    url.searchParams.set("start_at_max", endTime);
    if (cursor) url.searchParams.set("cursor", cursor);

    const body = await squareJson(url, token);
    if (body.bookings !== undefined && !Array.isArray(body.bookings)) {
      throw new Error("Square returned an invalid bookings collection");
    }
    bookings.push(...((body.bookings as unknown[] | undefined) ?? []));

    const nextCursor =
      typeof body.cursor === "string" && body.cursor !== "" ? body.cursor : undefined;
    if (!nextCursor) return bookings;
    if (seenCursors.has(nextCursor)) {
      throw new Error("Square returned a repeated booking cursor");
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw new Error("Square booking history exceeded 100,000 records");
}

async function retrieveCatalogPrices(
  token: string,
  objectIds: string[],
): Promise<Map<string, CatalogServicePrice>> {
  const catalog = new Map<string, CatalogServicePrice>();
  if (objectIds.length === 0) return catalog;

  for (let index = 0; index < objectIds.length; index += 100) {
    const batch = objectIds.slice(index, index + 100);
    const body = await squareJson(new URL(`${SQUARE_BASE}/catalog/batch-retrieve`), token, {
      method: "POST",
      body: JSON.stringify({
        object_ids: batch,
        include_related_objects: true,
      }),
    });

    const objects = [
      ...((body.objects as unknown[] | undefined) ?? []),
      ...((body.related_objects as unknown[] | undefined) ?? []),
    ];
    for (const object of objects) {
      const price = catalogPriceFromObject(object);
      if (!price) continue;
      const id = (object as Record<string, unknown>).id;
      if (typeof id === "string") catalog.set(id, price);
    }
  }

  return catalog;
}

function parseTime(value: string | null, field: string, fallback?: string): string {
  const resolved = value ?? fallback;
  if (!resolved || Number.isNaN(Date.parse(resolved))) {
    throw new Error(`${field} must be a valid RFC 3339 timestamp`);
  }
  return new Date(resolved).toISOString();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = Deno.env.get("SQUARE_ACCESS_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "SQUARE_ACCESS_TOKEN is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(request.url);
    const beginTime = parseTime(url.searchParams.get("beginTime"), "beginTime");
    const endTime = parseTime(url.searchParams.get("endTime"), "endTime", new Date().toISOString());
    if (Date.parse(beginTime) >= Date.parse(endTime)) {
      throw new Error("beginTime must be before endTime");
    }

    const windows = squareBookingSearchWindows(beginTime, endTime).slice(-48);
    const bookings: unknown[] = [];
    for (let index = 0; index < windows.length; index += 4) {
      const pages = await Promise.all(
        windows
          .slice(index, index + 4)
          .map((window) => listBookings(token, window.beginTime, window.endTime)),
      );
      for (const page of pages) bookings.push(...page);
    }
    const catalog = await retrieveCatalogPrices(token, collectServiceVariationIds(bookings));
    const byId = new Map<string, SquarePaymentRecord>();
    for (const booking of bookings) {
      const appointment = normalizeSquareBooking(booking, catalog);
      if (appointment) byId.set(appointment.id, appointment);
    }

    const appointments = [...byId.values()].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    return new Response(
      JSON.stringify({
        appointments,
        beginTime,
        endTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
