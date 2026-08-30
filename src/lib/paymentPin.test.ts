import { describe, expect, it } from "vitest";
import { isValidPaymentsPin } from "./paymentPin";

describe("payments PIN", () => {
  it("accepts only the configured PIN", () => {
    expect(isValidPaymentsPin("0000", "2468")).toBe(false);
    expect(isValidPaymentsPin("2468", "2468")).toBe(true);
    expect(isValidPaymentsPin("2468", "")).toBe(false);
  });
});
