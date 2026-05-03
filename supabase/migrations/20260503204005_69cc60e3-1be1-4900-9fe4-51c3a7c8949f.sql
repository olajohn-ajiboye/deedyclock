-- Workers and sessions persistence with shared access for any authenticated user

CREATE TABLE public.workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  hourly_rate NUMERIC,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  customer_square_id TEXT,
  customer_name TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_worker_id ON public.sessions(worker_id);
CREATE INDEX idx_sessions_start_at ON public.sessions(start_at);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Shared data: any authenticated user can read/write
CREATE POLICY "Authenticated can view workers" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert workers" ON public.workers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update workers" ON public.workers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete workers" ON public.workers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view sessions" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sessions" ON public.sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_workers_updated_at BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();