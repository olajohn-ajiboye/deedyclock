import { corsHeaders, SQUARE_BASE } from "../_shared/square.ts";
import {
  isUpdateCustomerNoteRequest,
  mapSquareCustomer,
  parseUpdateCustomerNoteRequest,
} from "../_shared/squareCustomers.ts";

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

  const squareHeaders = {
    Authorization: `Bearer ${token}`,
    "Square-Version": "2024-10-17",
    "Content-Type": "application/json",
  };

  try {
    const body = await req.json().catch(() => ({}));
    if (isUpdateCustomerNoteRequest(body)) {
      const update = parseUpdateCustomerNoteRequest(body);
      const res = await fetch(`${SQUARE_BASE}/customers/${encodeURIComponent(update.squareId)}`, {
        method: "PUT",
        headers: squareHeaders,
        body: JSON.stringify({
          note: update.note,
          version: update.version,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: "Square API error", status: res.status, body: payload }),
          { status: res.status === 409 ? 409 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ customer: mapSquareCustomer(payload.customer) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customers: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const url = new URL(`${SQUARE_BASE}/customers`);
      url.searchParams.set("limit", "100");
      if (cursor) url.searchParams.set("cursor", cursor);
      url.searchParams.set("sort_field", "DEFAULT");
      url.searchParams.set("sort_order", "ASC");

      const res = await fetch(url.toString(), { headers: squareHeaders });
      const listBody = await res.json();
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: "Square API error", status: res.status, body: listBody }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (Array.isArray(listBody.customers)) customers.push(...listBody.customers);
      cursor = listBody.cursor;
      if (!cursor) break;
    }

    const mapped = customers.map((customer) => mapSquareCustomer(customer));
    return new Response(JSON.stringify({ customers: mapped }), {
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
