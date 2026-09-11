import { supabase } from "@/integrations/supabase/client";
import { store } from "./store";
import { toast } from "sonner";
import {
  parseSquareCustomersResponse,
  parseUpdatedSquareCustomerResponse,
  type SquareCustomerRecord,
} from "../../supabase/functions/_shared/squareCustomers";
import {
  parseBookingNotesResponse,
  parseUpdatedBookingNoteResponse,
  type SquareBookingNote,
} from "../../supabase/functions/_shared/squareBookingNotes";

export type SquareSyncStatus = "idle" | "syncing" | "success" | "error";

let inflight: Promise<void> | null = null;

function throwIfFunctionFailed(data: unknown, error: unknown) {
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    throw new Error((data as { error: string }).error);
  }
  if (error) throw error instanceof Error ? error : new Error("Square request failed");
}

export async function syncCustomersFromSquare(opts?: { silent?: boolean }) {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("square-customers", {
        body: {},
      });
      throwIfFunctionFailed(data, error);
      const customers = parseSquareCustomersResponse(data);
      store.replaceCustomersFromSquare(customers);
      if (!opts?.silent) {
        toast.success(`Synced ${customers.length} clients from Square`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      if (!opts?.silent) toast.error(`Square sync failed: ${msg}`);
      else console.warn("Square sync failed:", msg);
      throw err;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function updateCustomerNoteOnSquare(input: {
  squareId: string;
  note: string;
  version: number;
}): Promise<SquareCustomerRecord> {
  const { data, error } = await supabase.functions.invoke("square-customers", {
    body: input,
  });
  throwIfFunctionFailed(data, error);
  const customer = parseUpdatedSquareCustomerResponse(data);
  store.applySquareCustomer(customer);
  return customer;
}

export async function retrieveBookingNotesFromSquare(
  bookingIds: string[],
): Promise<SquareBookingNote[]> {
  if (bookingIds.length === 0) return [];
  const { data, error } = await supabase.functions.invoke("square-bookings", {
    body: { bookingIds },
  });
  throwIfFunctionFailed(data, error);
  return parseBookingNotesResponse(data);
}

export async function updateVisitNoteOnSquare(input: {
  bookingId: string;
  note: string;
}): Promise<SquareBookingNote> {
  const { data, error } = await supabase.functions.invoke("square-bookings", {
    body: input,
  });
  throwIfFunctionFailed(data, error);
  return parseUpdatedBookingNoteResponse(data);
}
