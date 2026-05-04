import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, DBState, Session, Worker } from "./types";

/** deedylocs.ca theme-color  */
export const DEEDYLOCS_SITE_GREEN = "152 26% 41%";

const PALETTE = [
  "275 42% 48%",
  DEEDYLOCS_SITE_GREEN,
  "38 52% 54%",
  "8 58% 52%",
  "210 40% 48%",
  "280 35% 52%",
  "32 45% 48%",
  "165 28% 42%",
];

export function pickColor(seedIndex: number) {
  return PALETTE[seedIndex % PALETTE.length];
}

let state: DBState = {
  workers: [],
  customers: [],
  sessions: [],
  loaded: false,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(updater: (s: DBState) => DBState) {
  state = updater(state);
  emit();
}

// ---------- mappers ----------

type WorkerRow = {
  id: string;
  name: string;
  color: string;
  hourly_rate: number | string | null;
  archived: boolean;
};
type SessionRow = {
  id: string;
  worker_id: string;
  customer_square_id: string | null;
  customer_name: string;
  start_at: string;
  end_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToWorker(r: WorkerRow): Worker {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    hourlyRate: r.hourly_rate == null ? undefined : Number(r.hourly_rate),
    archived: r.archived,
  };
}
function rowToSession(r: SessionRow): Session {
  return {
    id: r.id,
    workerId: r.worker_id,
    customerSquareId: r.customer_square_id,
    customerName: r.customer_name,
    startAt: new Date(r.start_at).getTime(),
    endAt: r.end_at ? new Date(r.end_at).getTime() : null,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

// ---------- loading ----------

let loadPromise: Promise<void> | null = null;

export async function loadFromCloud(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [workersRes, sessionsRes] = await Promise.all([
      supabase.from("workers").select("*").order("created_at", { ascending: true }),
      supabase.from("sessions").select("*").order("start_at", { ascending: false }),
    ]);
    if (workersRes.error) throw workersRes.error;
    if (sessionsRes.error) throw sessionsRes.error;
    setState((s) => ({
      ...s,
      workers: (workersRes.data as WorkerRow[]).map(rowToWorker),
      sessions: (sessionsRes.data as SessionRow[]).map(rowToSession),
      loaded: true,
    }));
  })();
  try {
    await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export function clearCloudCache() {
  state = { workers: [], customers: [], sessions: [], loaded: false };
  emit();
}

// ---------- store API ----------

export const store = {
  getState: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Workers
  async addWorker(name: string, hourlyRate?: number) {
    const color = pickColor(state.workers.length);
    const { data, error } = await supabase
      .from("workers")
      .insert({ name: name.trim(), color, hourly_rate: hourlyRate ?? null })
      .select()
      .single();
    if (error) throw error;
    const w = rowToWorker(data as WorkerRow);
    setState((s) => ({ ...s, workers: [...s.workers, w] }));
  },
  async updateWorker(id: string, patch: Partial<Worker>) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.hourlyRate !== undefined) dbPatch.hourly_rate = patch.hourlyRate ?? null;
    if (patch.archived !== undefined) dbPatch.archived = patch.archived;
    const { error } = await supabase.from("workers").update(dbPatch as never).eq("id", id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      workers: s.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
  },
  async deleteWorker(id: string) {
    await store.updateWorker(id, { archived: true });
  },

  // Customers (in-memory only, populated by Square sync)
  replaceCustomersFromSquare(
    incoming: Array<{ squareId: string; name: string; phone?: string; note?: string; email?: string }>,
  ) {
    setState((s) => {
      const next: Customer[] = incoming.map((sq, i) => ({
        id: sq.squareId, // use squareId as local id
        name: sq.name,
        phone: sq.phone,
        note: sq.note,
        email: sq.email,
        color: pickColor(i + 3),
        squareId: sq.squareId,
      }));
      return { ...s, customers: next };
    });
  },

  // Sessions
  async startSession(workerId: string, customer: { squareId: string | null; name: string }) {
    const startAt = new Date();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        worker_id: workerId,
        customer_square_id: customer.squareId,
        customer_name: customer.name,
        start_at: startAt.toISOString(),
        end_at: null,
      })
      .select()
      .single();
    if (error) throw error;
    setState((s) => ({ ...s, sessions: [rowToSession(data as SessionRow), ...s.sessions] }));
  },
  async endSession(id: string) {
    const endAt = new Date();
    const { error } = await supabase
      .from("sessions")
      .update({ end_at: endAt.toISOString() })
      .eq("id", id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, endAt: endAt.getTime() } : x)),
    }));
  },
  async updateSession(id: string, patch: Partial<Session>) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.startAt !== undefined) dbPatch.start_at = new Date(patch.startAt).toISOString();
    if (patch.endAt !== undefined)
      dbPatch.end_at = patch.endAt === null ? null : new Date(patch.endAt).toISOString();
    if (patch.customerSquareId !== undefined) dbPatch.customer_square_id = patch.customerSquareId;
    if (patch.customerName !== undefined) dbPatch.customer_name = patch.customerName;
    const { error } = await supabase.from("sessions").update(dbPatch as never).eq("id", id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  },
  async deleteSession(id: string) {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) throw error;
    setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
  },
};

export function useStore<T>(selector: (s: DBState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// Live ticking timer (1s) for active session displays
const tickListeners = new Set<() => void>();
let tickInterval: ReturnType<typeof setInterval> | null = null;
function ensureTick() {
  if (tickInterval) return;
  tickInterval = setInterval(() => tickListeners.forEach((l) => l()), 1000);
}
export function useNow(): number {
  return useSyncExternalStore(
    (cb) => {
      ensureTick();
      tickListeners.add(cb);
      return () => {
        tickListeners.delete(cb);
        if (tickListeners.size === 0 && tickInterval) {
          clearInterval(tickInterval);
          tickInterval = null;
        }
      };
    },
    () => Math.floor(Date.now() / 1000) * 1000,
    () => Date.now(),
  );
}

/** Like `useNow` but only runs a 1s interval while `enabled` — avoids global ticking when idle. */
export function useLiveClock(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}
