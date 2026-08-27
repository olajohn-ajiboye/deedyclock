import { describe, expect, it } from "vitest";
import { visibleCustomerNote } from "./customerNotes";

describe("visibleCustomerNote", () => {
  it("hides Square customer-merge leftovers and keeps the real note", () => {
    expect(
      visibleCustomerNote(
        "// Merged on 04/04/2025. Following fields were not transferred to the new customer.",
      ),
    ).toBe("");

    expect(
      visibleCustomerNote(
        "Prefers silk press\n// Merged on 22/05/2026. Following fields were not transferred to the",
      ),
    ).toBe("Prefers silk press");
  });
});
