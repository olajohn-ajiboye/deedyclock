CREATE TABLE public.daily_cash_collections (
  collected_on DATE NOT NULL PRIMARY KEY,
  cash_amount_minor INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_cash_collections_amount_nonnegative CHECK (cash_amount_minor >= 0)
);

ALTER TABLE public.daily_cash_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view daily cash collections"
  ON public.daily_cash_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert daily cash collections"
  ON public.daily_cash_collections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update daily cash collections"
  ON public.daily_cash_collections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete daily cash collections"
  ON public.daily_cash_collections FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_daily_cash_collections_updated_at
  BEFORE UPDATE ON public.daily_cash_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
