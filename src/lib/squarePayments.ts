import { supabase } from "@/integrations/supabase/client";
import type { PaymentRange, SquarePaymentRecord } from "@/lib/paymentReport";

function parseAppointment(value: unknown, index: number): SquarePaymentRecord {
  if (!value || typeof value !== "object") {
    throw new Error(`Square appointment ${index} is invalid`);
  }
  const appointment = value as Record<string, unknown>;
  if (typeof appointment.id !== "string" || appointment.id === "") {
    throw new Error(`Square appointment ${index} has invalid id`);
  }
  if (typeof appointment.createdAt !== "string" || Number.isNaN(Date.parse(appointment.createdAt))) {
    throw new Error(`Square appointment ${appointment.id} has invalid createdAt`);
  }
  if (
    typeof appointment.amountMinor !== "number" ||
    !Number.isSafeInteger(appointment.amountMinor) ||
    appointment.amountMinor < 0
  ) {
    throw new Error(`Square appointment ${appointment.id} has invalid amountMinor`);
  }
  if (typeof appointment.currency !== "string" || appointment.currency === "") {
    throw new Error(`Square appointment ${appointment.id} has invalid currency`);
  }
  if (appointment.customerId !== null && typeof appointment.customerId !== "string") {
    throw new Error(`Square appointment ${appointment.id} has invalid customerId`);
  }
  if (
    !Array.isArray(appointment.serviceNames) ||
    appointment.serviceNames.some((name) => typeof name !== "string" || name === "")
  ) {
    throw new Error(`Square appointment ${appointment.id} has invalid serviceNames`);
  }
  if (typeof appointment.unpriced !== "boolean") {
    throw new Error(`Square appointment ${appointment.id} has invalid unpriced`);
  }

  return {
    id: appointment.id,
    customerId: appointment.customerId as string | null,
    createdAt: new Date(appointment.createdAt).toISOString(),
    amountMinor: appointment.amountMinor,
    currency: appointment.currency,
    serviceNames: appointment.serviceNames as string[],
    unpriced: appointment.unpriced,
  };
}

export function parseSquareBookedAppointmentsResponse(value: unknown): SquarePaymentRecord[] {
  if (!value || typeof value !== "object") {
    throw new Error("Square appointments response is invalid");
  }
  const appointments = (value as Record<string, unknown>).appointments;
  if (!Array.isArray(appointments)) {
    throw new Error("Square appointments response has no appointments collection");
  }

  const parsed = appointments.map(parseAppointment);
  const ids = new Set<string>();
  for (const appointment of parsed) {
    if (ids.has(appointment.id)) {
      throw new Error(`Square appointments response contains duplicate ${appointment.id}`);
    }
    ids.add(appointment.id);
  }
  return parsed;
}

export async function fetchSquareBookedAppointments(
  range: PaymentRange,
  signal?: AbortSignal,
): Promise<SquarePaymentRecord[]> {
  const { data: auth } = await supabase.auth.getSession();
  const jwt = auth.session?.access_token;
  if (!jwt) {
    throw new Error("Sign in required to load Square appointments.");
  }

  const base = import.meta.env.VITE_SUPABASE_URL;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !apikey) {
    throw new Error("Supabase configuration is missing.");
  }

  const query = new URLSearchParams({ beginTime: range.beginTime });
  if (range.endTime) query.set("endTime", range.endTime);
  const response = await fetch(`${base}/functions/v1/square-payments?${query}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey,
    },
    signal,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && typeof body.error === "string"
        ? body.error
        : `Appointments fetch failed (${response.status})`;
    throw new Error(message);
  }
  return parseSquareBookedAppointmentsResponse(body);
}
