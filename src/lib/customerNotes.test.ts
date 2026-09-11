import { describe, expect, it } from "vitest";
import { squareNoteForUpdate, visibleCustomerNote } from "./customerNotes";

describe("visibleCustomerNote", () => {
  it("hides Square customer-merge leftovers and keeps the real note", () => {
    expect(
      visibleCustomerNote(
        "// Merged on 04/04/2025. Following fields were not transferred to the new customer.",
      ),
    ).toBe("");

    expect(
      visibleCustomerNote(
        "Prefers silk press\n// Merged on 22/05/2026. Following fields were not transferred to the\nFirst Name: Adaeze\nPhone Number: +15555550100",
      ),
    ).toBe("Prefers silk press");

    expect(
      visibleCustomerNote(
        "\n// Merged on 03/11/2025. Following fields were not transferred to the current customer.\nTime Zone: America/Vancouver",
      ),
    ).toBe("");
  });
});

describe("squareNoteForUpdate", () => {
  it("keeps Square merge leftovers when saving the visible note", () => {
    expect(
      squareNoteForUpdate(
        "Prefers silk press",
        "// Merged on 04/04/2025. Following fields were not transferred to the new customer.\nPhone Number: 555-0100",
      ),
    ).toBe(
      "Prefers silk press\n// Merged on 04/04/2025. Following fields were not transferred to the new customer.\nPhone Number: 555-0100",
    );
  });
});
