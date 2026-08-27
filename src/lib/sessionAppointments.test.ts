import { describe, expect, it } from "vitest";
import { appointmentForSession } from "./sessionAppointments";
import type { SquarePaymentRecord } from "./paymentReport";

const appointments: SquarePaymentRecord[] = [
  {
    id: "morning",
    customerId: "c1",
    createdAt: "2026-08-26T15:00:00.000Z",
    amountMinor: 10_000,
    currency: "CAD",
    serviceNames: ["Retwist"],
    unpriced: false,
  },
  {
    id: "afternoon",
    customerId: "c1",
    createdAt: "2026-08-26T20:00:00.000Z",
    amountMinor: 5_000,
    currency: "CAD",
    serviceNames: ["Wash"],
    unpriced: false,
  },
];

describe("appointmentForSession", () => {
  it("matches a session to the closest unused appointment for that customer", () => {
    const claimed = new Set<string>();
    const first = appointmentForSession(
      { customerSquareId: "c1", startAt: Date.parse("2026-08-26T20:05:00.000Z") },
      appointments,
      claimed,
    );
    claimed.add(first!.id);

    expect(first?.id).toBe("afternoon");
    expect(
      appointmentForSession(
        { customerSquareId: "c1", startAt: Date.parse("2026-08-26T15:10:00.000Z") },
        appointments,
        claimed,
      )?.id,
    ).toBe("morning");
  });

  it("returns nothing when the session has no Square customer", () => {
    expect(
      appointmentForSession(
        { customerSquareId: null, startAt: Date.now() },
        appointments,
        new Set(),
      ),
    ).toBeUndefined();
  });
});
