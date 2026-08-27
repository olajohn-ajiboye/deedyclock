const UNLOCK_KEY = "deedyclock.paymentsUnlocked";

export function configuredPaymentsPin(): string {
  return (import.meta.env.VITE_PAYMENTS_PIN ?? "").trim();
}

export function isPaymentsUnlocked(storage: Storage = sessionStorage): boolean {
  return storage.getItem(UNLOCK_KEY) === "1";
}

export function tryUnlockPayments(
  pin: string,
  expected: string = configuredPaymentsPin(),
  storage: Storage = sessionStorage,
): boolean {
  if (!expected || pin !== expected) return false;
  storage.setItem(UNLOCK_KEY, "1");
  return true;
}

export function lockPayments(storage: Storage = sessionStorage): void {
  storage.removeItem(UNLOCK_KEY);
}
