import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentNoteField } from "./AppointmentNoteField";
import { saveAppointmentNote } from "@/lib/appointmentPayments";

vi.mock("@/lib/appointmentPayments", () => ({
  saveAppointmentNote: vi.fn(),
}));

describe("AppointmentNoteField", () => {
  const onSaved = vi.fn();

  beforeEach(() => {
    onSaved.mockReset();
    vi.mocked(saveAppointmentNote).mockResolvedValue(undefined);
  });

  it("shows an existing visit note and saves an edit", async () => {
    render(
      <AppointmentNoteField
        bookingId="b1"
        customerName="Ada"
        note="Used extra oil"
        onSaved={onSaved}
      />,
    );

    expect(screen.getByText("Used extra oil")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit visit note for Ada" }));
    const field = screen.getByLabelText("Visit note for Ada");
    fireEvent.change(field, { target: { value: "Low heat only" } });
    fireEvent.blur(field);

    await waitFor(() => {
      expect(saveAppointmentNote).toHaveBeenCalledWith("b1", "Low heat only");
    });
    expect(onSaved).toHaveBeenCalledWith("Low heat only");
  });
});
