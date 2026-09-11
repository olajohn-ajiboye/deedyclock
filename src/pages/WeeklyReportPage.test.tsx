import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WeeklyReportPage from "./WeeklyReportPage";
import {
  fetchStoredAppointmentsInRange,
  syncAppointmentPaymentCopies,
} from "@/lib/appointmentPayments";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";

vi.mock("@/lib/squarePayments", () => ({
  fetchSquareBookedAppointments: vi.fn(),
}));

vi.mock("@/lib/appointmentPayments", () => ({
  fetchStoredAppointmentsInRange: vi.fn(),
  syncAppointmentPaymentCopies: vi.fn(),
}));

vi.mock("@/components/EditSessionDrawer", () => ({
  EditSessionDrawer: () => null,
}));

const startAt = new Date(2026, 8, 7, 9, 2).getTime();
const endAt = new Date(2026, 8, 7, 9, 58).getTime();

vi.mock("@/lib/store", () => ({
  useNow: () => endAt,
  useStore: (
    selector: (state: {
      workers: unknown[];
      customers: unknown[];
      sessions: unknown[];
    }) => unknown,
  ) =>
    selector({
      workers: [
        {
          id: "w1",
          name: "Ada",
          color: "220 70% 50%",
          archived: false,
        },
      ],
      customers: [
        {
          id: "c1",
          squareId: "c1",
          name: "Brittney Lockhart",
          color: "220 70% 50%",
        },
      ],
      sessions: [
        {
          id: "s1",
          workerId: "w1",
          customerSquareId: "c1",
          customerName: "Brittney Lockhart",
          startAt,
          endAt,
          createdAt: startAt,
          updatedAt: endAt,
        },
      ],
    }),
}));

describe("WeeklyReportPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 10, 12, 0));
    vi.mocked(fetchSquareBookedAppointments).mockRejectedValue(new Error("Square unavailable"));
    vi.mocked(syncAppointmentPaymentCopies).mockResolvedValue({});
    vi.mocked(fetchStoredAppointmentsInRange).mockResolvedValue({
      appointments: [
        {
          id: "b1",
          customerId: "c1",
          createdAt: new Date(2026, 8, 7, 9, 0).toISOString(),
          amountMinor: 8_000,
          currency: "CAD",
          serviceNames: ["Retwist"],
          unpriced: false,
        },
      ],
      edits: {
        b1: { paidAmountMinor: 8_000, tipAmountMinor: 2_000, productAmountMinor: 0 },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows paid and tip under each session duration", async () => {
    render(<WeeklyReportPage />);

    expect(await screen.findByText(/\$80/)).toBeInTheDocument();
    expect(screen.getByText(/\$20 tip/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sessions" })).toBeInTheDocument();
  });
});
