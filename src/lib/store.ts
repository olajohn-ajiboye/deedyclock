import { useSyncExternalStore } from "react";
import type { Customer, DBState, Session, Worker } from "./types";

const STORAGE_KEY = "salon-hours.v1";

const PALETTE = [
  "326 38% 45%", // plum
  "36 70% 55%",  // gold
  "152 35% 40%", // sage
  "8 65% 55%",   // terracotta
  "210 45% 45%", // dusty blue
  "280 30% 50%", // violet
  "20 55% 50%",  // copper
  "180 30% 40%", // teal
];

export function pickColor(seedIndex: number) {
  return PALETTE[seedIndex % PALETTE.length];
}

const seed = (): DBState => {
  const now = Date.now();
  const workers: Worker[] = [
    { id: "w1", name: "Ava Mendes", color: PALETTE[0] },
    { id: "w2", name: "Sofia Lin", color: PALETTE[1] },
    { id: "w3", name: "Jordan Reyes", color: PALETTE[2] },
    { id: "w4", name: "Maya Khan", color: PALETTE[3] },
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
    return JSON.parse(raw);
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
      workers: s.workers.map((w) =>
        w.id === id ? { ...w, archived: true } : w,
      ),
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
      customers: s.customers.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
  },
  deleteCustomer(id: string) {
    setState((s) => ({
      ...s,
      customers: s.customers.map((c) =>
        c.id === id ? { ...c, archived: true } : c,
      ),
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
      sessions: s.sessions.map((x) =>
        x.id === id ? { ...x, endAt: now, updatedAt: now } : x,
      ),
    }));
  },
  updateSession(id: string, patch: Partial<Session>) {
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) =>
        x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x,
      ),
    }));
  },
  deleteSession(id: string) {
    setState((s) => ({
      ...s,
      sessions: s.sessions.filter((x) => x.id !== id),
    }));
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
