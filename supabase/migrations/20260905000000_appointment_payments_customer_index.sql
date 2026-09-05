CREATE INDEX IF NOT EXISTS idx_appointment_payments_customer_square_id
  ON public.appointment_payments(customer_square_id);
