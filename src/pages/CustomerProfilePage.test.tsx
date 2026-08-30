import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerProfilePage from "./CustomerProfilePage";
import { syncAppointmentPaymentCopies } from "@/lib/appointmentPayments";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";

vi.mock("@/lib/squarePayments", () => ({
  fetchSquareBookedAppointments: vi.fn(),
}));

vi.mock("@/lib/appointmentPayments", () => ({
  syncAppointmentPaymentCopies: vi.fn(),
}));

vi.mock("@/lib/appointmentImages", () => ({
  listAppointmentImages: vi.fn().mockResolvedValue([]),
  uploadAppointmentImage: vi.fn(),
  deleteAppointmentImage: vi.fn(),
  publicUrlForAppointmentImage: vi.fn(() => "https://img.test/photo.jpg"),
}));

vi.mock("@/lib/squareSync", () => ({
  updateCustomerNoteOnSquare: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  useStore: (selector: (state: { customers: unknown[] }) => unknown) =>
    selector({
      customers: [
        {
          id: "c1",
          squareId: "c1",
          name: "Ada",
          color: "220 70% 50%",
          phone: "555-0100",
          email: "ada@example.com",
          note: "Prefers silk press",
          squareVersion: 2,
        },
      ],
    }),
}));

describe("CustomerProfilePage", () => {
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
      {
        id: "other",
        customerId: "c2",
        createdAt: "2026-08-21T12:00:00Z",
        amountMinor: 5_000,
        currency: "CAD",
        serviceNames: ["Trim"],
        unpriced: false,
      },
    ]);
    vi.mocked(syncAppointmentPaymentCopies).mockResolvedValue({
      b1: { paidAmountMinor: 10_000, tipAmountMinor: 2_000, productAmountMinor: 0 },
    });
  });

  it("shows notes and that client's past appointments", async () => {
    render(
      <MemoryRouter initialEntries={["/customers/c1"]}>
        <Routes>
          <Route path="/customers/:squareId" element={<CustomerProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByText("Prefers silk press")).toBeInTheDocument();
    expect(screen.getByText("Retwist")).toBeInTheDocument();
    expect(screen.queryByText("Trim")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit notes for Ada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take photo for Ada" })).toBeInTheDocument();
  });
});
