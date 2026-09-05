import { describe, expect, it } from "vitest";
import { appointmentForSession, completedAppointmentIds } from "./sessionAppointments";
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

  it("treats only finished sessions as completed appointments", () => {
    expect(
      completedAppointmentIds(
        [
          {
            customerSquareId: "c1",
            startAt: Date.parse("2026-08-26T20:05:00.000Z"),
            endAt: Date.parse("2026-08-26T21:00:00.000Z"),
          },
          {
            customerSquareId: "c1",
            startAt: Date.parse("2026-08-26T15:10:00.000Z"),
            endAt: null,
          },
        ],
        appointments,
      ),
    ).toEqual(new Set(["afternoon"]));
  });

  it("does not mark a future booking completed from an earlier finished session", () => {
    expect(
      completedAppointmentIds(
        [
          {
            customerSquareId: "c1",
            startAt: Date.parse("2026-09-04T18:00:00.000Z"),
            endAt: Date.parse("2026-09-04T19:00:00.000Z"),
          },
        ],
        [
          {
            id: "october",
            customerId: "c1",
            createdAt: "2026-10-15T18:00:00.000Z",
            amountMinor: 10_000,
            currency: "CAD",
            serviceNames: ["Retwist"],
            unpriced: false,
          },
        ],
      ),
    ).toEqual(new Set());
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
