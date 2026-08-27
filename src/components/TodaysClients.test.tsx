import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodaysClients } from "./TodaysClients";
import { useTodayBookings } from "@/lib/squareBookings";

vi.mock("@/lib/squareBookings", () => ({
  useTodayBookings: vi.fn(),
}));

describe("TodaysClients", () => {
  const onStart = vi.fn();

  beforeEach(() => {
    onStart.mockReset();
    vi.mocked(useTodayBookings).mockReturnValue({
      bookings: [
        {
          id: "b1",
          customerId: "c1",
          startAt: new Date().toISOString(),
          teamMemberIds: [],
        },
      ],
      loading: false,
      error: null,
    });
  });

  it("starts a session from the client row and does not show paid editors", async () => {
    render(
      <MemoryRouter>
      <TodaysClients
        customers={[
          {
            id: "local-1",
            squareId: "c1",
            name: "Ada",
            color: "220 70% 50%",
            phone: "555-0100",
          },
        ]}
        onStart={onStart}
      />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.queryByLabelText("Paid for Ada")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit notes for Ada" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Notes for Ada")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit notes for Ada" }));
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith({
        id: "local-1",
        squareId: "c1",
        name: "Ada",
      });
    });
  });
});
