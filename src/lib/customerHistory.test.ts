import { describe, expect, it } from "vitest";
import { appointmentsForCustomer } from "./customerHistory";

describe("appointmentsForCustomer", () => {
  const appointments = [
    {
      id: "b2",
      customerId: "c1",
      createdAt: "2026-08-20T12:00:00Z",
      amountMinor: 12_500,
      currency: "CAD",
      serviceNames: ["Retwist"],
      unpriced: false,
    },
    {
      id: "b1",
      customerId: "c1",
      createdAt: "2026-07-01T12:00:00Z",
      amountMinor: 8_000,
      currency: "CAD",
      serviceNames: ["Wash"],
      unpriced: false,
    },
    {
      id: "other",
      customerId: "c2",
      createdAt: "2026-08-21T12:00:00Z",
      amountMinor: 5_000,
      currency: "CAD",
      serviceNames: ["Trim"],
      unpriced: false,
    },
  ];

  it("returns only that client's appointments, newest first", () => {
    expect(appointmentsForCustomer(appointments, "c1").map((item) => item.id)).toEqual([
      "b2",
      "b1",
    ]);
  });
});
