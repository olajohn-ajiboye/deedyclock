import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerNoteField } from "./CustomerNoteField";
import { updateCustomerNoteOnSquare } from "@/lib/squareSync";

vi.mock("@/lib/squareSync", () => ({
  updateCustomerNoteOnSquare: vi.fn(),
}));

const ada = {
  id: "c1",
  squareId: "c1",
  name: "Ada",
  color: "220 70% 50%",
  squareVersion: 4,
};

describe("CustomerNoteField", () => {
  beforeEach(() => {
    vi.mocked(updateCustomerNoteOnSquare).mockResolvedValue({
      squareId: "c1",
      name: "Ada",
      note: "Prefers silk press",
      version: 5,
    });
  });

  it("keeps the editor closed until the pencil is used, hides merge leftovers, and saves on blur", async () => {
    const onStart = vi.fn();
    render(
      <div onClick={onStart}>
        <CustomerNoteField
          customer={{
            ...ada,
            note: "// Merged on 04/04/2025. Following fields were not transferred to the new customer.",
          }}
        />
      </div>,
    );

    expect(screen.queryByLabelText("Notes for Ada")).not.toBeInTheDocument();
    expect(screen.queryByText(/Merged on/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit notes for Ada" }));
    expect(onStart).not.toHaveBeenCalled();

    const note = screen.getByLabelText("Notes for Ada");
    expect(note).toHaveValue("");
    fireEvent.change(note, { target: { value: "Prefers silk press" } });
    fireEvent.blur(note);

    await waitFor(() => {
      expect(updateCustomerNoteOnSquare).toHaveBeenCalledWith({
        squareId: "c1",
        note: "Prefers silk press",
        version: 4,
      });
    });
  });

  it("shows a short preview beside the note icon when a note already exists", () => {
    render(
      <CustomerNoteField
        compact
        customer={{
          ...ada,
          note: "Prefers silk press and warm water rinse",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit notes for Ada" })).toHaveTextContent(
      /Prefers silk press/,
    );
  });
});
