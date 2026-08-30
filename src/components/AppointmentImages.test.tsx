import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentImages } from "./AppointmentImages";
import {
  deleteAppointmentImage,
  listAppointmentImages,
  uploadAppointmentImage,
} from "@/lib/appointmentImages";

vi.mock("@/lib/appointmentImages", () => ({
  listAppointmentImages: vi.fn(),
  uploadAppointmentImage: vi.fn(),
  deleteAppointmentImage: vi.fn(),
  publicUrlForAppointmentImage: vi.fn((path: string) => `https://img.test/${path}`),
}));

describe("AppointmentImages", () => {
  beforeEach(() => {
    vi.mocked(listAppointmentImages).mockResolvedValue([]);
    vi.mocked(uploadAppointmentImage).mockResolvedValue({
      id: "img1",
      appointmentKey: "b1",
      storagePath: "b1/img1.jpg",
      contentType: "image/jpeg",
      createdAt: new Date().toISOString(),
    });
  });

  it("uploads a photo for the appointment", async () => {
    render(<AppointmentImages appointmentKey="b1" customerName="Ada" />);

    expect(await screen.findByRole("button", { name: "Add photos for Ada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take photo for Ada" })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"][capture]')).not.toBeNull();

    const file = new File(["photo"], "style.jpg", { type: "image/jpeg" });
    const libraryInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;
    fireEvent.change(libraryInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadAppointmentImage).toHaveBeenCalledWith("b1", file);
    });
  });

  it("opens an expanded view when a stored photo is tapped", async () => {
    vi.mocked(listAppointmentImages).mockResolvedValue([
      {
        id: "img1",
        appointmentKey: "b1",
        storagePath: "b1/img1.jpg",
        contentType: "image/jpeg",
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<AppointmentImages appointmentKey="b1" customerName="Ada" />);

    fireEvent.click(await screen.findByRole("button", { name: "View photo for Ada" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Photo for Ada" })).toHaveAttribute(
      "src",
      "https://img.test/b1/img1.jpg",
    );
  });

  it("asks for confirmation before deleting a photo", async () => {
    const image = {
      id: "img1",
      appointmentKey: "b1",
      storagePath: "b1/img1.jpg",
      contentType: "image/jpeg",
      createdAt: new Date().toISOString(),
    };
    vi.mocked(listAppointmentImages).mockResolvedValue([image]);
    vi.mocked(deleteAppointmentImage).mockResolvedValue(undefined);

    render(<AppointmentImages appointmentKey="b1" customerName="Ada" />);

    fireEvent.click(await screen.findByRole("button", { name: "Remove photo for Ada" }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Delete this photo?")).toBeInTheDocument();
    expect(deleteAppointmentImage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(deleteAppointmentImage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Remove photo for Ada" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete photo" }));

    await waitFor(() => {
      expect(deleteAppointmentImage).toHaveBeenCalledWith(image);
    });
  });
});
