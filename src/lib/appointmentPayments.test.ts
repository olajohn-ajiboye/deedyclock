import { describe, expect, it } from "vitest";
import {
  copiesToInsert,
  editsFromStoredRows,
} from "./appointmentPayments";
import type { SquarePaymentRecord } from "./paymentReport";

const appointments: SquarePaymentRecord[] = [
  {
    id: "b1",
    customerId: "c1",
    createdAt: "2026-08-01T10:00:00Z",
    amountMinor: 10_000,
    currency: "CAD",
    serviceNames: ["Retwist"],
    unpriced: false,
  },
  {
    id: "b2",
    customerId: "c1",
    createdAt: "2026-08-02T10:00:00Z",
    amountMinor: 5_000,
    currency: "CAD",
    serviceNames: ["Wash"],
    unpriced: false,
  },
];

describe("editsFromStoredRows", () => {
  it("uses stored paid and tip when a copy exists, otherwise the catalog price", () => {
    expect(
      editsFromStoredRows(appointments, [
        {
          booking_id: "b1",
          paid_amount_minor: 8_000,
          tip_amount_minor: 2_000,
          product_amount_minor: 1_500,
        },
      ]),
    ).toEqual({
      b1: { paidAmountMinor: 8_000, tipAmountMinor: 2_000, productAmountMinor: 1_500 },
      b2: { paidAmountMinor: 5_000, tipAmountMinor: 0, productAmountMinor: 0 },
    });
  });
});

describe("copiesToInsert", () => {
  it("inserts only appointments that do not already have a stored copy", () => {
    expect(
      copiesToInsert(appointments, new Set(["b1"]), (customerId) =>
        customerId === "c1" ? "Ada" : "Unknown",
      ),
    ).toEqual([
      {
        booking_id: "b2",
        customer_square_id: "c1",
        customer_name: "Ada",
        start_at: "2026-08-02T10:00:00Z",
        catalog_amount_minor: 5_000,
        paid_amount_minor: 5_000,
        tip_amount_minor: 0,
        product_amount_minor: 0,
        currency: "CAD",
        service_names: ["Wash"],
        unpriced: false,
      },
    ]);
  });
});
