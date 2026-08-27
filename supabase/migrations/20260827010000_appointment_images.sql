-- Photos attached to Square bookings or unmatched clock sessions

CREATE TABLE public.appointment_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_key TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_images_appointment_key
  ON public.appointment_images(appointment_key);

ALTER TABLE public.appointment_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view appointment images"
  ON public.appointment_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert appointment images"
  ON public.appointment_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete appointment images"
  ON public.appointment_images FOR DELETE TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('appointment-images', 'appointment-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload appointment image files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'appointment-images');

CREATE POLICY "Authenticated can update appointment image files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'appointment-images');

CREATE POLICY "Anyone can view appointment image files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'appointment-images');

CREATE POLICY "Authenticated can delete appointment image files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'appointment-images');
