import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentsPinLock } from "./PaymentsPinLock";
import { isPaymentsUnlocked, tryUnlockPayments } from "@/lib/paymentPin";

vi.mock("@/lib/paymentPin", () => ({
  isPaymentsUnlocked: vi.fn(),
  tryUnlockPayments: vi.fn(),
  lockPayments: vi.fn(),
}));

describe("PaymentsPinLock", () => {
  it("asks for a PIN before showing payments", () => {
    vi.mocked(isPaymentsUnlocked).mockReturnValue(false);
    vi.mocked(tryUnlockPayments).mockReturnValue(false);

    render(
      <PaymentsPinLock>
        <p>Money</p>
      </PaymentsPinLock>,
    );

    expect(screen.queryByText("Money")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Payments PIN"), { target: { value: "0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(screen.getByText("That PIN is not correct.")).toBeInTheDocument();
    expect(tryUnlockPayments).toHaveBeenCalledWith("0000");
  });

  it("shows payments after a correct PIN", () => {
    vi.mocked(isPaymentsUnlocked).mockReturnValue(false);
    vi.mocked(tryUnlockPayments).mockImplementation(() => {
      vi.mocked(isPaymentsUnlocked).mockReturnValue(true);
      return true;
    });

    render(
      <PaymentsPinLock>
        <p>Money</p>
      </PaymentsPinLock>,
    );

    fireEvent.change(screen.getByLabelText("Payments PIN"), { target: { value: "2468" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(screen.getByText("Money")).toBeInTheDocument();
  });
});
