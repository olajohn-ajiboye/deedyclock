-- Stored copies of Square booked appointments, with editable paid price and optional tip

CREATE TABLE public.appointment_payments (
  booking_id TEXT NOT NULL PRIMARY KEY,
  customer_square_id TEXT,
  customer_name TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  catalog_amount_minor INTEGER NOT NULL,
  paid_amount_minor INTEGER NOT NULL,
  tip_amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  service_names TEXT[] NOT NULL DEFAULT '{}',
  unpriced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointment_payments_catalog_amount_nonnegative CHECK (catalog_amount_minor >= 0),
  CONSTRAINT appointment_payments_paid_amount_nonnegative CHECK (paid_amount_minor >= 0),
  CONSTRAINT appointment_payments_tip_amount_nonnegative CHECK (tip_amount_minor >= 0)
);

CREATE INDEX idx_appointment_payments_start_at ON public.appointment_payments(start_at);

ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view appointment payments"
  ON public.appointment_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert appointment payments"
  ON public.appointment_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update appointment payments"
  ON public.appointment_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete appointment payments"
  ON public.appointment_payments FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_appointment_payments_updated_at
  BEFORE UPDATE ON public.appointment_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
