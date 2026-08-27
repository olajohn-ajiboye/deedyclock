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

vi.mock("@/lib/appointmentImages", () => ({
  listAppointmentImages: vi.fn().mockResolvedValue([]),
  uploadAppointmentImage: vi.fn(),
  deleteAppointmentImage: vi.fn(),
  publicUrlForAppointmentImage: vi.fn(() => "https://img.test/photo.jpg"),
}));

vi.mock("@/lib/store", () => ({
  useStore: (selector: (state: { customers: unknown[] }) => unknown) =>
    selector({ customers: [{ squareId: "c1", name: "Ada" }] }),
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
      b1: { paidAmountMinor: 10_000, tipAmountMinor: 2_000 },
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
      screen.getByText(/Square catalog service prices/i),
    ).toBeInTheDocument();
  });

  it("lists each appointment with its date, customer, service, paid amount, and tip", async () => {
    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Customer" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Photos" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Paid" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tip" })).toBeInTheDocument();
    expect(screen.getByText("Retwist")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Paid for Ada")).toHaveTextContent(/100/);
    expect(screen.getByLabelText("Tip for Ada")).toHaveTextContent(/20/);
  });

  it("reflects stored paid and tip totals without offering editors", async () => {
    render(
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("status", { name: "Paid total" })).toHaveTextContent(/100/);
    expect(screen.getByRole("status", { name: "Tips total" })).toHaveTextContent(/20/);
    expect(
      screen.getByText(/entered from today's sessions/i),
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
