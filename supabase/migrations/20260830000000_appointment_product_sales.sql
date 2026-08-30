ALTER TABLE public.appointment_payments
  ADD COLUMN product_amount_minor INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.appointment_payments
  ADD CONSTRAINT appointment_payments_product_amount_nonnegative
  CHECK (product_amount_minor >= 0);
