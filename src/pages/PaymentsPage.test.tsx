import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { addMonths, addYears, format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentsPage from "./PaymentsPage";
import { syncAppointmentPaymentCopies } from "@/lib/appointmentPayments";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";

vi.mock("@/lib/squarePayments", () => ({
  fetchSquareBookedAppointments: vi.fn(),
}));

vi.mock("@/lib/appointmentPayments", () => ({
  saveAppointmentPayment: vi.fn(),
  syncAppointmentPaymentCopies: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  useStore: (
    selector: (state: { customers: unknown[]; sessions: unknown[] }) => unknown,
  ) =>
    selector({
      customers: [{ squareId: "c1", name: "Ada" }],
      sessions: [
        {
          id: "s1",
          workerId: "w1",
          customerSquareId: "c1",
          customerName: "Ada",
          startAt: Date.parse("2026-08-20T12:00:00Z"),
          endAt: Date.parse("2026-08-20T13:00:00Z"),
          createdAt: Date.parse("2026-08-20T12:00:00Z"),
          updatedAt: Date.parse("2026-08-20T13:00:00Z"),
        },
      ],
    }),
}));

describe("PaymentsPage", () => {
  beforeEach(() => {
    vi.mocked(fetchSquareBookedAppointments).mockResolvedValue([
      {
        id: "b1",
        customerId: "c1",
        createdAt: "2026-08-20T12:00:00Z",
        amountMinor: 12_500,
        currency: "CAD",
        serviceNames: ["Retwist"],
        unpriced: false,
      },
    ]);
    vi.mocked(syncAppointmentPaymentCopies).mockResolvedValue({
      b1: { paidAmountMinor: 10_000, tipAmountMinor: 2_000, productAmountMinor: 1_500 },
    });
  });

  it("states that totals come from booked appointment catalog prices", async () => {
    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Booked appointment totals")).toBeInTheDocument();
    expect(screen.getByText(format(new Date(), "MMMM yyyy"))).toBeInTheDocument();
    expect(
      screen.getByText(/completed sessions over booked/i),
    ).toBeInTheDocument();
  });

  it("lists each appointment with its date, customer, service, cost, tip, and product", async () => {
    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Customer" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Photos" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cost" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tip" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByText("Retwist")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Cost for Ada")).toHaveTextContent(/100/);
    expect(screen.getByLabelText("Tip for Ada")).toHaveTextContent(/20/);
    expect(screen.getByLabelText("Product for Ada")).toHaveTextContent(/15/);
    expect(screen.getByLabelText("Cost $100")).toBeInTheDocument();
    expect(screen.getByLabelText("Tip $20")).toBeInTheDocument();
    expect(screen.getByLabelText("Product $15")).toBeInTheDocument();
    expect(screen.getByText("$135")).toBeInTheDocument();
    expect(screen.queryByText(/tips \$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Daily" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Daily" }));

    expect(screen.getByRole("button", { name: "Daily" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Cost $100")).toBeInTheDocument();
  });

  it("reflects stored paid and tip totals without offering editors", async () => {
    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("status", { name: "Cost total" })).toHaveTextContent(/100.*\/.*100/);
    expect(screen.getByRole("status", { name: "Tips total" })).toHaveTextContent(/20/);
    expect(screen.getByRole("status", { name: "Product total" })).toHaveTextContent(/15/);
    expect(screen.getByRole("status", { name: "Appointments total" })).toHaveTextContent("1 / 1");
    expect(screen.getByRole("status", { name: "Customers total" })).toHaveTextContent("1 / 1");
    expect(
      screen.getAllByText(
        (_content, element) =>
          element?.tagName === "P" && element.textContent === "completed / booked",
      ),
    ).toHaveLength(3);
    expect(
      screen.getByText(/completed sessions over booked/i),
    ).toBeInTheDocument();
  });

  it("updates the month label when navigating to another month", async () => {
    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(format(new Date(), "MMMM yyyy"))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));

    await waitFor(() => {
      expect(screen.getByText(format(addMonths(new Date(), 1), "MMMM yyyy"))).toBeInTheDocument();
    });
  });

  it("navigates by calendar year instead of all history", async () => {
    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "Year" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "All history" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Year" }));

    expect(await screen.findByText(format(new Date(), "yyyy"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next year" }));

    await waitFor(() => {
      expect(screen.getByText(format(addYears(new Date(), 1), "yyyy"))).toBeInTheDocument();
    });
  });
});
