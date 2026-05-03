import { supabase } from "@/integrations/supabase/client";
import { store } from "./store";
import { toast } from "sonner";

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
      const customers = (data as any)?.customers;
      if (!Array.isArray(customers)) {
        throw new Error("Unexpected response from Square sync");
      }
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
