import { corsHeaders } from "@supabase/supabase-js/cors";

const SQUARE_BASE = "https://connect.squareup.com/v2";

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

  try {
    const customers: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;
    // Paginate through all customers (cap at 10 pages / ~1000 records as safety)
    for (let i = 0; i < 10; i++) {
      const url = new URL(`${SQUARE_BASE}/customers`);
      url.searchParams.set("limit", "100");
      if (cursor) url.searchParams.set("cursor", cursor);
      url.searchParams.set("sort_field", "DEFAULT");
      url.searchParams.set("sort_order", "ASC");

      const res = await fetch(url.toString(), {
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
      if (Array.isArray(body.customers)) customers.push(...body.customers);
      cursor = body.cursor;
      if (!cursor) break;
    }

    const mapped = customers.map((c: any) => {
      const name =
        [c.given_name, c.family_name].filter(Boolean).join(" ").trim() ||
        c.company_name ||
        c.nickname ||
        c.email_address ||
        c.phone_number ||
        "Unnamed client";
      return {
        squareId: c.id as string,
        name,
        phone: c.phone_number ?? undefined,
        note: c.note ?? undefined,
        email: c.email_address ?? undefined,
      };
    });

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
