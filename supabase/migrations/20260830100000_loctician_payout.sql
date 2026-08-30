ALTER TABLE public.daily_cash_collections
  ADD COLUMN loctician_payout_minor INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.daily_cash_collections
  ADD CONSTRAINT daily_cash_collections_payout_nonnegative
  CHECK (loctician_payout_minor >= 0);
