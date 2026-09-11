export interface SquareBookingNote {
  bookingId: string;
  note: string;
  version: number;
}

function parseVersion(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)) return Number(value);
  throw new Error(`${label} has invalid version`);
}

export function sellerNoteFromBooking(value: unknown): SquareBookingNote {
  if (!value || typeof value !== "object") {
    throw new Error("Square booking is invalid");
  }
  const booking = value as Record<string, unknown>;
  if (typeof booking.id !== "string" || booking.id === "") {
    throw new Error("Square booking has invalid id");
  }
  return {
    bookingId: booking.id,
    note: typeof booking.seller_note === "string" ? booking.seller_note : "",
    version: parseVersion(booking.version, `Square booking ${booking.id}`),
  };
}

export function parseRetrieveBookingNotesRequest(value: unknown): { bookingIds: string[] } {
  if (!value || typeof value !== "object") {
    throw new Error("Booking note request is invalid");
  }
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.bookingIds) || body.bookingIds.length === 0) {
    throw new Error("Booking note request has no bookingIds");
  }
  const bookingIds = body.bookingIds.filter(
    (id): id is string => typeof id === "string" && id !== "",
  );
  if (bookingIds.length === 0) {
    throw new Error("Booking note request has no bookingIds");
  }
  return { bookingIds };
}

export function parseUpdateBookingNoteRequest(value: unknown): {
  bookingId: string;
  note: string;
} {
  if (!value || typeof value !== "object") {
    throw new Error("Booking note update is invalid");
  }
  const body = value as Record<string, unknown>;
  if (typeof body.bookingId !== "string" || body.bookingId === "") {
    throw new Error("Booking note update has invalid bookingId");
  }
  if (typeof body.note !== "string") {
    throw new Error("Booking note update has invalid note");
  }
  if (body.note.length > 4096) {
    throw new Error("Visit notes must be 4096 characters or fewer");
  }
  return { bookingId: body.bookingId, note: body.note };
}

export function isUpdateBookingNoteRequest(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "bookingId" in value && "note" in value);
}

export function parseBookingNotesResponse(value: unknown): SquareBookingNote[] {
  if (!value || typeof value !== "object") {
    throw new Error("Booking notes response is invalid");
  }
  const notes = (value as Record<string, unknown>).notes;
  if (!Array.isArray(notes)) {
    throw new Error("Booking notes response has no notes collection");
  }
  return notes.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Booking note is invalid");
    }
    const record = item as Record<string, unknown>;
    if (typeof record.bookingId !== "string" || record.bookingId === "") {
      throw new Error("Booking note has invalid bookingId");
    }
    return {
      bookingId: record.bookingId,
      note: typeof record.note === "string" ? record.note : "",
      version: parseVersion(record.version, `Booking ${record.bookingId}`),
    };
  });
}

export function parseUpdatedBookingNoteResponse(value: unknown): SquareBookingNote {
  if (!value || typeof value !== "object") {
    throw new Error("Booking note update response is invalid");
  }
  const note = (value as Record<string, unknown>).note;
  if (note && typeof note === "object" && "bookingId" in note) {
    const [parsed] = parseBookingNotesResponse({ notes: [note] });
    return parsed;
  }
  throw new Error("Booking note update response has no note");
}

export function notesByBookingId(notes: SquareBookingNote[]): Record<string, string> {
  return Object.fromEntries(notes.map((item) => [item.bookingId, item.note]));
}
