import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodaysSessions } from "./TodaysSessions";
import {
  saveAppointmentPayment,
  syncAppointmentPaymentCopies,
} from "@/lib/appointmentPayments";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";
import type { Session } from "@/lib/types";

vi.mock("@/lib/squarePayments", () => ({
  fetchSquareBookedAppointments: vi.fn(),
}));

vi.mock("@/lib/appointmentPayments", () => ({
  saveAppointmentPayment: vi.fn(),
  syncAppointmentPaymentCopies: vi.fn(),
}));

vi.mock("@/lib/squareSync", () => ({
  updateCustomerNoteOnSquare: vi.fn(),
}));

vi.mock("@/lib/appointmentImages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/appointmentImages")>();
  return {
    ...actual,
    listAppointmentImages: vi.fn().mockResolvedValue([]),
    uploadAppointmentImage: vi.fn(),
    deleteAppointmentImage: vi.fn(),
    publicUrlForAppointmentImage: vi.fn(() => "https://img.test/photo.jpg"),
  };
});

const session: Session = {
  id: "s1",
  workerId: "w1",
  customerSquareId: "c1",
  customerName: "Ada",
  startAt: Date.now() - 60_000,
  endAt: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("TodaysSessions", () => {
  const onEditSession = vi.fn();

  beforeEach(() => {
    onEditSession.mockReset();
    vi.mocked(fetchSquareBookedAppointments).mockResolvedValue([
      {
        id: "b1",
        customerId: "c1",
        createdAt: new Date().toISOString(),
        amountMinor: 12_500,
        currency: "CAD",
        serviceNames: ["Retwist"],
        unpriced: false,
      },
    ]);
    vi.mocked(syncAppointmentPaymentCopies).mockResolvedValue({
      b1: { paidAmountMinor: 12_500, tipAmountMinor: 0 },
    });
    vi.mocked(saveAppointmentPayment).mockResolvedValue(undefined);
  });

  it("lets the user edit cost and tip without starting a session", async () => {
    render(
      <MemoryRouter>
        <TodaysSessions
          sessions={[session]}
          customers={[
            {
              id: "local-1",
              squareId: "c1",
              name: "Ada",
              color: "220 70% 50%",
              note: "Prefers silk press",
              squareVersion: 2,
            },
          ]}
          now={Date.now()}
          day={new Date()}
          onEditSession={onEditSession}
        />
      </MemoryRouter>,
    );

    const cost = await screen.findByLabelText("Cost for Ada");
    const tip = screen.getByLabelText("Tip for Ada");
    expect(screen.getByText("Cost")).toBeInTheDocument();
    expect(screen.getByText("Tip")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit notes for Ada" })).toBeInTheDocument();
    expect(screen.queryByText(/Paid for/i)).not.toBeInTheDocument();

    fireEvent.click(cost);
    fireEvent.change(cost, { target: { value: "100" } });
    fireEvent.blur(cost);
    fireEvent.change(tip, { target: { value: "20" } });
    fireEvent.blur(tip);

    await waitFor(() => {
      expect(saveAppointmentPayment).toHaveBeenCalledWith("b1", 10_000, 0);
      expect(saveAppointmentPayment).toHaveBeenCalledWith("b1", 10_000, 2_000);
    });
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(onEditSession).not.toHaveBeenCalled();
  });
});
