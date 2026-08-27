import { supabase } from "@/integrations/supabase/client";
import { store } from "./store";
import { toast } from "sonner";
import {
  parseSquareCustomersResponse,
  parseUpdatedSquareCustomerResponse,
  type SquareCustomerRecord,
} from "../../supabase/functions/_shared/squareCustomers";

export type SquareSyncStatus = "idle" | "syncing" | "success" | "error";

let inflight: Promise<void> | null = null;

export async function syncCustomersFromSquare(opts?: { silent?: boolean }) {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("square-customers", {
        body: {},
      });
      if (error) throw error;
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
  if (error) throw error;
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    throw new Error((data as { error: string }).error);
  }
  const customer = parseUpdatedSquareCustomerResponse(data);
  store.applySquareCustomer(customer);
  return customer;
}
