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

  it("starts a session from the client row without a notes column", async () => {
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
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Client", "Action"]);
    expect(screen.queryByRole("button", { name: "Edit notes for Ada" })).not.toBeInTheDocument();

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
