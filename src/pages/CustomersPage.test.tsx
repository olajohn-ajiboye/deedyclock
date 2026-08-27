import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import CustomersPage from "./CustomersPage";

vi.mock("@/lib/squareSync", () => ({
  syncCustomersFromSquare: vi.fn(),
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
        },
      ],
    }),
}));

describe("CustomersPage", () => {
  it("makes each client a link to their visit history", () => {
    render(
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Ada/ })).toHaveAttribute("href", "/customers/c1");
  });
});
