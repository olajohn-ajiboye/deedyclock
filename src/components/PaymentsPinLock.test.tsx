import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentsPinLock } from "./PaymentsPinLock";
import { isValidPaymentsPin } from "@/lib/paymentPin";

vi.mock("@/lib/paymentPin", () => ({
  isValidPaymentsPin: vi.fn(),
  configuredPaymentsPin: vi.fn(),
}));

describe("PaymentsPinLock", () => {
  it("asks for a PIN before showing payments", () => {
    vi.mocked(isValidPaymentsPin).mockReturnValue(false);

    render(
      <PaymentsPinLock>
        <p>Money</p>
      </PaymentsPinLock>,
    );

    expect(screen.queryByText("Money")).not.toBeInTheDocument();
    fireEvent.focus(screen.getByLabelText("Payments PIN"));
    fireEvent.change(screen.getByLabelText("Payments PIN"), { target: { value: "0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(screen.getByText("That PIN is not correct.")).toBeInTheDocument();
    expect(isValidPaymentsPin).toHaveBeenCalledWith("0000");
  });

  it("shows payments after a correct PIN", () => {
    vi.mocked(isValidPaymentsPin).mockReturnValue(true);

    render(
      <PaymentsPinLock>
        <p>Money</p>
      </PaymentsPinLock>,
    );

    fireEvent.focus(screen.getByLabelText("Payments PIN"));
    fireEvent.change(screen.getByLabelText("Payments PIN"), { target: { value: "2468" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(screen.getByText("Money")).toBeInTheDocument();
  });

  it("asks again when remounted", () => {
    vi.mocked(isValidPaymentsPin).mockReturnValueOnce(true).mockReturnValue(false);

    const { unmount } = render(
      <PaymentsPinLock>
        <p>Money</p>
      </PaymentsPinLock>,
    );

    fireEvent.focus(screen.getByLabelText("Payments PIN"));
    fireEvent.change(screen.getByLabelText("Payments PIN"), { target: { value: "2468" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(screen.getByText("Money")).toBeInTheDocument();

    unmount();
    render(
      <PaymentsPinLock>
        <p>Money</p>
      </PaymentsPinLock>,
    );

    expect(screen.queryByText("Money")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Payments PIN")).toBeInTheDocument();
  });
});
