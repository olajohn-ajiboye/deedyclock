import { describe, expect, it } from "vitest";
import {
  mapSquareCustomer,
  parseSquareCustomersResponse,
  parseUpdateCustomerNoteRequest,
} from "../../supabase/functions/_shared/squareCustomers";

describe("mapSquareCustomer", () => {
  it("maps Square customer notes and version for two-way sync", () => {
    expect(
      mapSquareCustomer({
        id: "c1",
        given_name: "Ada",
        family_name: "Lovelace",
        phone_number: "555-0100",
        email_address: "ada@example.com",
        note: "Prefers silk press",
        version: "4",
      }),
    ).toEqual({
      squareId: "c1",
      name: "Ada Lovelace",
      phone: "555-0100",
      email: "ada@example.com",
      note: "Prefers silk press",
      version: 4,
    });
  });
});

describe("parseUpdateCustomerNoteRequest", () => {
  it("accepts a note update including an empty note", () => {
    expect(
      parseUpdateCustomerNoteRequest({ squareId: "c1", note: "", version: 2 }),
    ).toEqual({ squareId: "c1", note: "", version: 2 });
  });

  it("rejects notes that are too long for Square", () => {
    expect(() =>
      parseUpdateCustomerNoteRequest({
        squareId: "c1",
        note: "x".repeat(2001),
        version: 1,
      }),
    ).toThrow("2000");
  });
});

describe("parseSquareCustomersResponse", () => {
  it("rejects a payload without customers", () => {
    expect(() => parseSquareCustomersResponse({})).toThrow("customers");
  });
});
