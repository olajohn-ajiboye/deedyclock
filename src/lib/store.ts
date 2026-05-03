import { useSyncExternalStore } from "react";
import type { Customer, DBState, Session, Worker } from "./types";

const STORAGE_KEY = "salon-hours.v1";

/** deedylocs.ca theme-color #4e846c */
export const DEEDYLOCS_SITE_GREEN = "152 26% 41%";

const PALETTE = [
  "275 42% 48%", // purple (OreOluwa default lane)
  DEEDYLOCS_SITE_GREEN,
  "38 52% 54%", // honey accent
  "8 58% 52%", // terracotta
  "210 40% 48%", // dusty blue
  "280 35% 52%", // violet
  "32 45% 48%", // copper
  "165 28% 42%", // deep teal
];

export function pickColor(seedIndex: number) {
  return PALETTE[seedIndex % PALETTE.length];
}

const seed = (): DBState => {
  const now = Date.now();
  const workers: Worker[] = [
    { id: "w1", name: "OreOluwa", color: "275 45% 46%" },
    { id: "w2", name: "Dami", color: DEEDYLOCS_SITE_GREEN },
  ];
  const customers: Customer[] = [
    { id: "c1", name: "Eleanor Park", color: PALETTE[4] },
    { id: "c2", name: "Maria Gomez", color: PALETTE[5] },
    { id: "c3", name: "Hiro Tanaka", color: PALETTE[6] },
    { id: "c4", name: "Priya Shah", color: PALETTE[7] },
    { id: "c5", name: "Walk-in", color: PALETTE[2] },
  ];
  const sessions: Session[] = [
    {
      id: "s1",
      workerId: "w1",
      customerId: "c1",
      startAt: now - 1000 * 60 * 60 * 26,
      endAt: now - 1000 * 60 * 60 * 24,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "s2",
      workerId: "w2",
      customerId: "c2",
      startAt: now - 1000 * 60 * 60 * 5,
      endAt: now - 1000 * 60 * 60 * 3.5,
      createdAt: now,
      updatedAt: now,
    },
  ];
  return { workers, customers, sessions };
};

function normalizeDeedySlotGreen(workers: Worker[]): Worker[] {
  return workers.map((w) => {
    const namedDeedy = w.name.trim().toLowerCase() === "deedy";
    const seededSecondSlot = w.id === "w2";
    if (!namedDeedy && !seededSecondSlot) return w;
    if (w.color === DEEDYLOCS_SITE_GREEN) return w;
    return { ...w, color: DEEDYLOCS_SITE_GREEN };
  });
}

let state: DBState = load();
const listeners = new Set<() => void>();

function load(): DBState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as DBState;
    const prevWorkers = parsed.workers ?? [];
    const workers = normalizeDeedySlotGreen(prevWorkers);
    const changed = workers.some((w, i) => w !== prevWorkers[i]);
    if (changed) {
      const next = { ...parsed, workers };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    }
    return parsed;
  } catch {
    return seed();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
  listeners.forEach((l) => l());
}

function setState(updater: (s: DBState) => DBState) {
  state = updater(state);
  persist();
}

export const store = {
  getState: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Workers
  addWorker(name: string, hourlyRate?: number) {
    setState((s) => ({
      ...s,
      workers: [
        ...s.workers,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          color: pickColor(s.workers.length),
          hourlyRate,
        },
      ],
    }));
  },
  updateWorker(id: string, patch: Partial<Worker>) {
    setState((s) => ({
      ...s,
      workers: s.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
  },
  deleteWorker(id: string) {
    setState((s) => ({
      ...s,
      workers: s.workers.map((w) => (w.id === id ? { ...w, archived: true } : w)),
    }));
  },

  // Customers
  addCustomer(name: string, phone?: string, note?: string) {
    setState((s) => ({
      ...s,
      customers: [
        ...s.customers,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          phone,
          note,
          color: pickColor(s.customers.length + 3),
        },
      ],
    }));
  },
  updateCustomer(id: string, patch: Partial<Customer>) {
    setState((s) => ({
      ...s,
      customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },
  deleteCustomer(id: string) {
    setState((s) => ({
      ...s,
      customers: s.customers.map((c) => (c.id === id ? { ...c, archived: true } : c)),
    }));
  },

  // Sessions
  startSession(workerId: string, customerId: string) {
    const now = Date.now();
    setState((s) => ({
      ...s,
      sessions: [
        ...s.sessions,
        {
          id: crypto.randomUUID(),
          workerId,
          customerId,
          startAt: now,
          endAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
  },
  endSession(id: string) {
    const now = Date.now();
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, endAt: now, updatedAt: now } : x)),
    }));
  },
  updateSession(id: string, patch: Partial<Session>) {
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)),
    }));
  },
  deleteSession(id: string) {
    setState((s) => ({
      ...s,
      sessions: s.sessions.filter((x) => x.id !== id),
    }));
  },

  // Replace entire customer list (used by Square sync). Archives any local
  // customers without a squareId match, and merges existing entries by squareId
  // to preserve their stable color and id.
  replaceCustomersFromSquare(
    incoming: Array<{ squareId: string; name: string; phone?: string; note?: string; email?: string }>,
  ) {
    setState((s) => {
      const bySquareId = new Map(
        s.customers.filter((c) => c.squareId).map((c) => [c.squareId!, c]),
      );
      const next: Customer[] = incoming.map((sq, i) => {
        const existing = bySquareId.get(sq.squareId);
        if (existing) {
          return {
            ...existing,
            name: sq.name,
            phone: sq.phone,
            note: sq.note,
            email: sq.email,
            archived: false,
          };
        }
        return {
          id: crypto.randomUUID(),
          name: sq.name,
          phone: sq.phone,
          note: sq.note,
          email: sq.email,
          color: pickColor(i + 3),
          squareId: sq.squareId,
        };
      });
      // Keep local-only customers (no squareId) referenced by sessions, archived.
      const referencedIds = new Set(s.sessions.map((x) => x.customerId));
      const localKept = s.customers
        .filter((c) => !c.squareId && referencedIds.has(c.id))
        .map((c) => ({ ...c, archived: true }));
      return { ...s, customers: [...next, ...localKept] };
    });
  },

  resetAll() {
    state = seed();
    persist();
  },
};

export function useStore<T>(selector: (s: DBState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

// Live ticking timer (1s) for active session displays
const tickListeners = new Set<() => void>();
let tickInterval: ReturnType<typeof setInterval> | null = null;

function ensureTick() {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    tickListeners.forEach((l) => l());
  }, 1000);
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
