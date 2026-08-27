import { describe, expect, it } from "vitest";
import {
  isPaymentsUnlocked,
  lockPayments,
  tryUnlockPayments,
} from "./paymentPin";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("payments PIN", () => {
  it("unlocks only with the configured PIN and remembers it for the tab", () => {
    const storage = memoryStorage();

    expect(tryUnlockPayments("0000", "2468", storage)).toBe(false);
    expect(isPaymentsUnlocked(storage)).toBe(false);

    expect(tryUnlockPayments("2468", "2468", storage)).toBe(true);
    expect(isPaymentsUnlocked(storage)).toBe(true);

    lockPayments(storage);
    expect(isPaymentsUnlocked(storage)).toBe(false);
  });
});
