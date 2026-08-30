import { supabase } from "@/integrations/supabase/client";
import { localDayKey, type DailyCashEntry } from "@/lib/cashReconciliation";
import type { PaymentRange } from "@/lib/paymentReport";

export async function fetchDailyCash(range: PaymentRange): Promise<Record<string, DailyCashEntry>> {
  const begin = localDayKey(new Date(range.beginTime));
  const end = localDayKey(new Date(range.endTime ?? range.beginTime));
  const { data, error } = await supabase
    .from("daily_cash_collections")
    .select("collected_on, cash_amount_minor, loctician_payout_minor")
    .gte("collected_on", begin)
    .lt("collected_on", end);

  if (error) {
    throw new Error(error.message);
  }

  const byDay: Record<string, DailyCashEntry> = {};
  for (const row of data ?? []) {
    byDay[row.collected_on] = {
      cashMinor: row.cash_amount_minor,
      payoutMinor: row.loctician_payout_minor ?? 0,
    };
  }
  return byDay;
}

export async function saveDailyCash(dateKey: string, entry: DailyCashEntry): Promise<void> {
  const { error } = await supabase.from("daily_cash_collections").upsert(
    {
      collected_on: dateKey,
      cash_amount_minor: entry.cashMinor,
      loctician_payout_minor: entry.payoutMinor,
    },
    { onConflict: "collected_on" },
  );
  if (error) {
    throw new Error(error.message);
  }
}
