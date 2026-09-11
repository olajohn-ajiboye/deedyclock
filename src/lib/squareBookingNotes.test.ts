import { describe, expect, it } from "vitest";
import {
  parseRetrieveBookingNotesRequest,
  parseUpdateBookingNoteRequest,
  sellerNoteFromBooking,
} from "../../supabase/functions/_shared/squareBookingNotes";

describe("sellerNoteFromBooking", () => {
  it("maps Square seller notes and version", () => {
    expect(
      sellerNoteFromBooking({
        id: "b1",
        version: 3,
        seller_note: "Used extra oil",
      }),
    ).toEqual({
      bookingId: "b1",
      note: "Used extra oil",
      version: 3,
    });
  });
});

describe("parseUpdateBookingNoteRequest", () => {
  it("accepts an empty visit note", () => {
    expect(parseUpdateBookingNoteRequest({ bookingId: "b1", note: "" })).toEqual({
      bookingId: "b1",
      note: "",
    });
  });
});

describe("parseRetrieveBookingNotesRequest", () => {
  it("requires booking ids", () => {
    expect(() => parseRetrieveBookingNotesRequest({ bookingIds: [] })).toThrow("bookingIds");
  });
});
