import { supabase } from "@/integrations/supabase/client";
import {
  customerNameFor,
  customerNamesById,
  type AppointmentPaymentEdit,
  type SquarePaymentRecord,
} from "@/lib/paymentReport";

export type { AppointmentPaymentEdit };

export interface AppointmentPaymentRow {
  booking_id: string;
  paid_amount_minor: number;
  tip_amount_minor: number;
  product_amount_minor: number;
}

export interface AppointmentPaymentInsert {
  booking_id: string;
  customer_square_id: string | null;
  customer_name: string;
  start_at: string;
  catalog_amount_minor: number;
  paid_amount_minor: number;
  tip_amount_minor: number;
  product_amount_minor: number;
  currency: string;
  service_names: string[];
  unpriced: boolean;
}

const ID_CHUNK = 100;

export function editsFromStoredRows(
  appointments: SquarePaymentRecord[],
  stored: AppointmentPaymentRow[],
): Record<string, AppointmentPaymentEdit> {
  const byId = new Map(stored.map((row) => [row.booking_id, row]));
  const edits: Record<string, AppointmentPaymentEdit> = {};
  for (const appointment of appointments) {
    const row = byId.get(appointment.id);
    edits[appointment.id] = row
      ? {
          paidAmountMinor: row.paid_amount_minor,
          tipAmountMinor: row.tip_amount_minor,
          productAmountMinor: row.product_amount_minor ?? 0,
        }
      : {
          paidAmountMinor: appointment.amountMinor,
          tipAmountMinor: 0,
          productAmountMinor: 0,
        };
  }
  return edits;
}

export function copiesToInsert(
  appointments: SquarePaymentRecord[],
  storedIds: Set<string>,
  customerName: (customerId: string | null) => string,
): AppointmentPaymentInsert[] {
  return appointments
    .filter((appointment) => !storedIds.has(appointment.id))
    .map((appointment) => ({
      booking_id: appointment.id,
      customer_square_id: appointment.customerId,
      customer_name: customerName(appointment.customerId),
      start_at: appointment.createdAt,
      catalog_amount_minor: appointment.amountMinor,
      paid_amount_minor: appointment.amountMinor,
      tip_amount_minor: 0,
      product_amount_minor: 0,
      currency: appointment.currency,
      service_names: appointment.serviceNames,
      unpriced: appointment.unpriced,
    }));
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function fetchStoredRows(bookingIds: string[]): Promise<AppointmentPaymentRow[]> {
  const stored: AppointmentPaymentRow[] = [];
  for (const idChunk of chunks(bookingIds, ID_CHUNK)) {
    const { data, error } = await supabase
      .from("appointment_payments")
      .select("booking_id, paid_amount_minor, tip_amount_minor, product_amount_minor")
      .in("booking_id", idChunk);
    if (error) {
      throw new Error(error.message);
    }
    stored.push(...(data ?? []));
  }
  return stored;
}

export async function syncAppointmentPaymentCopies(
  appointments: SquarePaymentRecord[],
  customers: { squareId?: string; name: string }[],
): Promise<Record<string, AppointmentPaymentEdit>> {
  if (appointments.length === 0) return {};

  const stored = await fetchStoredRows(appointments.map((appointment) => appointment.id));
  const namesById = customerNamesById(customers);
  const inserts = copiesToInsert(
    appointments,
    new Set(stored.map((row) => row.booking_id)),
    (customerId) => customerNameFor(customerId, namesById),
  );

  for (const insertChunk of chunks(inserts, ID_CHUNK)) {
    const { error } = await supabase.from("appointment_payments").insert(insertChunk);
    if (error) {
      throw new Error(error.message);
    }
  }

  return editsFromStoredRows(appointments, stored);
}

export async function saveAppointmentPayment(
  bookingId: string,
  edit: AppointmentPaymentEdit,
): Promise<void> {
  const { error } = await supabase
    .from("appointment_payments")
    .update({
      paid_amount_minor: edit.paidAmountMinor,
      tip_amount_minor: edit.tipAmountMinor,
      product_amount_minor: edit.productAmountMinor,
    })
    .eq("booking_id", bookingId);
  if (error) {
    throw new Error(error.message);
  }
}
