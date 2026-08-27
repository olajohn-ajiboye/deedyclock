import { describe, expect, it } from "vitest";
import {
  appointmentImageStoragePath,
  assertAllowedAppointmentImage,
  imageKeyForAppointment,
} from "./appointmentImages";

describe("imageKeyForAppointment", () => {
  it("uses the Square booking id when the session is matched", () => {
    expect(imageKeyForAppointment("s1", "b1")).toBe("b1");
  });

  it("falls back to the session when there is no booked appointment", () => {
    expect(imageKeyForAppointment("s1", undefined)).toBe("session:s1");
  });
});

describe("assertAllowedAppointmentImage", () => {
  it("accepts jpeg, png, and webp under 10MB", () => {
    expect(() =>
      assertAllowedAppointmentImage({ type: "image/jpeg", size: 1_000_000, name: "a.jpg" }),
    ).not.toThrow();
  });

  it("rejects non-images and oversized files", () => {
    expect(() =>
      assertAllowedAppointmentImage({ type: "application/pdf", size: 100, name: "a.pdf" }),
    ).toThrow("image");
    expect(() =>
      assertAllowedAppointmentImage({ type: "image/jpeg", size: 11 * 1024 * 1024, name: "a.jpg" }),
    ).toThrow("10");
  });
});

describe("appointmentImageStoragePath", () => {
  it("stores files under the appointment key with a unique id", () => {
    expect(appointmentImageStoragePath("b1", "cut.JPG", "img-1")).toBe("b1/img-1.jpg");
    expect(appointmentImageStoragePath("session:s1", "photo.webp", "img-2")).toBe(
      "session_s1/img-2.webp",
    );
  });
});
