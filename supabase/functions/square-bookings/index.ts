import { corsHeaders, SQUARE_BASE, squareErrorMessage } from "../_shared/square.ts";
import {
  isUpdateBookingNoteRequest,
  parseRetrieveBookingNotesRequest,
  parseUpdateBookingNoteRequest,
  sellerNoteFromBooking,
} from "../_shared/squareBookingNotes.ts";

const squareHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Square-Version": "2024-10-17",
  "Content-Type": "application/json",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("SQUARE_ACCESS_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "SQUARE_ACCESS_TOKEN is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const headers = squareHeaders(token);

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (isUpdateBookingNoteRequest(body)) {
        const update = parseUpdateBookingNoteRequest(body);
        const currentRes = await fetch(
          `${SQUARE_BASE}/bookings/${encodeURIComponent(update.bookingId)}`,
          { headers },
        );
        const currentPayload = await currentRes.json();
        if (!currentRes.ok) {
          return new Response(
            JSON.stringify({
              error: squareErrorMessage(currentPayload, "Could not load this booking from Square"),
              status: currentRes.status,
              body: currentPayload,
            }),
            {
              status: currentRes.status === 404 ? 404 : 502,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        const current = sellerNoteFromBooking(currentPayload.booking);
        const res = await fetch(`${SQUARE_BASE}/bookings/${encodeURIComponent(update.bookingId)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            booking: {
              version: current.version,
              seller_note: update.note,
            },
          }),
        });
        const payload = await res.json();
        if (!res.ok) {
          return new Response(
            JSON.stringify({
              error: squareErrorMessage(payload, "Could not save the visit note to Square"),
              status: res.status,
              body: payload,
            }),
            { status: res.status === 409 ? 409 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ note: sellerNoteFromBooking(payload.booking) }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { bookingIds } = parseRetrieveBookingNotesRequest(body);
      const notes = [];
      for (let index = 0; index < bookingIds.length; index += 10) {
        const batch = bookingIds.slice(index, index + 10);
        const res = await fetch(`${SQUARE_BASE}/bookings/bulk-retrieve`, {
          method: "POST",
          headers,
          body: JSON.stringify({ booking_ids: batch }),
        });
        const payload = await res.json();
        if (!res.ok) {
          return new Response(
            JSON.stringify({
              error: squareErrorMessage(payload, "Could not load visit notes from Square"),
              status: res.status,
              body: payload,
            }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const bookings = payload.bookings;
        if (!bookings || typeof bookings !== "object") continue;
        for (const entry of Object.values(bookings as Record<string, unknown>)) {
          if (!entry || typeof entry !== "object") continue;
          const booking = (entry as { booking?: unknown }).booking;
          if (!booking) continue;
          notes.push(sellerNoteFromBooking(booking));
        }
      }
      return new Response(JSON.stringify({ notes }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date"); // YYYY-MM-DD in caller's local tz
    const tzOffsetMin = Number(url.searchParams.get("tzOffsetMin") ?? "0"); // JS getTimezoneOffset()

    // Compute start/end of the requested local day, expressed in UTC ISO.
    let startMs: number;
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      // Local midnight in the caller's tz: UTC ms = local midnight + offset
      startMs = Date.UTC(y, m - 1, d) + tzOffsetMin * 60_000;
    } else {
      const now = new Date();
      const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startMs = localMidnight.getTime();
    }
    const endMs = startMs + 24 * 60 * 60 * 1000;

    const bookings: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const u = new URL(`${SQUARE_BASE}/bookings`);
      u.searchParams.set("limit", "200");
      u.searchParams.set("start_at_min", new Date(startMs).toISOString());
      u.searchParams.set("start_at_max", new Date(endMs).toISOString());
      if (cursor) u.searchParams.set("cursor", cursor);

      const res = await fetch(u.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Square-Version": "2024-10-17",
          "Content-Type": "application/json",
        },
      });
      const body = await res.json();
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: "Square API error", status: res.status, body }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (Array.isArray(body.bookings)) bookings.push(...body.bookings);
      cursor = body.cursor;
      if (!cursor) break;
    }

    const mapped = bookings
      .filter((b: any) => b.status !== "CANCELLED_BY_CUSTOMER" && b.status !== "CANCELLED_BY_SELLER" && b.status !== "DECLINED" && b.status !== "NO_SHOW")
      .map((b: any) => ({
        id: b.id,
        customerId: b.customer_id,
        startAt: b.start_at,
        teamMemberIds: Array.isArray(b.appointment_segments)
          ? b.appointment_segments.map((s: any) => s.team_member_id).filter(Boolean)
          : [],
      }));

    return new Response(JSON.stringify({ bookings: mapped }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
