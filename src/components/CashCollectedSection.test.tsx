import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashCollectedSection } from "./CashCollectedSection";
import { fetchDailyCash, saveDailyCash } from "@/lib/cashCollections";
import { syncAppointmentPaymentCopies } from "@/lib/appointmentPayments";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";

vi.mock("@/lib/squarePayments", () => ({
  fetchSquareBookedAppointments: vi.fn(),
}));

vi.mock("@/lib/appointmentPayments", () => ({
  syncAppointmentPaymentCopies: vi.fn(),
}));

vi.mock("@/lib/cashCollections", () => ({
  fetchDailyCash: vi.fn(),
  saveDailyCash: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  useStore: (selector: (state: { customers: unknown[] }) => unknown) =>
    selector({ customers: [{ squareId: "c1", name: "Ada" }] }),
}));

describe("CashCollectedSection", () => {
  beforeEach(() => {
    vi.mocked(fetchSquareBookedAppointments).mockResolvedValue([
      {
        id: "b1",
        customerId: "c1",
        createdAt: new Date().toISOString(),
        amountMinor: 10_000,
        currency: "CAD",
        serviceNames: ["Retwist"],
        unpriced: false,
      },
    ]);
    vi.mocked(syncAppointmentPaymentCopies).mockResolvedValue({
      b1: { paidAmountMinor: 10_000, tipAmountMinor: 2_000, productAmountMinor: 1_500 },
    });
    vi.mocked(fetchDailyCash).mockResolvedValue({});
    vi.mocked(saveDailyCash).mockResolvedValue(undefined);
  });

  it("lets the user filter days and enter cash collected", async () => {
    render(<CashCollectedSection />);

    expect(await screen.findByRole("heading", { name: "Cash collected" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("columnheader", { name: "Revenue" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cash" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Loctician payout" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Difference" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Period" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getByRole("button", { name: "Day" })).toHaveAttribute("aria-pressed", "true");

    const cash = await screen.findByLabelText(/Cash for/i);
    fireEvent.change(cash, { target: { value: "80" } });
    fireEvent.blur(cash);

    await waitFor(() => {
      expect(saveDailyCash).toHaveBeenCalled();
    });
    expect(vi.mocked(saveDailyCash).mock.calls[0][1]).toEqual({
      cashMinor: 8_000,
      payoutMinor: 0,
    });

    const payout = screen.getByLabelText(/Loctician payout for/i);
    fireEvent.change(payout, { target: { value: "25" } });
    fireEvent.blur(payout);

    await waitFor(() => {
      expect(saveDailyCash).toHaveBeenLastCalledWith(expect.any(String), {
        cashMinor: 8_000,
        payoutMinor: 2_500,
      });
    });
  });
});
