import { useEffect, useState } from "react";

export interface SquareBooking {
  id: string;
  customerId: string;
  startAt: string;
  teamMemberIds: string[];
}

export async function fetchTodayBookings(): Promise<SquareBooking[]> {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const tzOffsetMin = now.getTimezoneOffset();
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(
    `${base}/functions/v1/square-bookings?date=${date}&tzOffsetMin=${tzOffsetMin}`,
    {
      headers: { Authorization: `Bearer ${anon}`, apikey: anon },
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Bookings fetch failed");
  const bookings = data?.bookings;
  if (!Array.isArray(bookings)) throw new Error("Unexpected response");
  return bookings as SquareBooking[];
}

export function useTodayBookings() {
  const [bookings, setBookings] = useState<SquareBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTodayBookings()
      .then((b) => {
        if (!cancelled) {
          setBookings(b);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load bookings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { bookings, error, loading };
}
