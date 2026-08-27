import { supabase } from "@/integrations/supabase/client";

export const APPOINTMENT_IMAGES_BUCKET = "appointment-images";
export const MAX_APPOINTMENT_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export interface AppointmentImage {
  id: string;
  appointmentKey: string;
  storagePath: string;
  contentType: string;
  createdAt: string;
}

export function imageKeyForAppointment(
  sessionId: string,
  bookingId: string | undefined,
): string {
  return bookingId ?? `session:${sessionId}`;
}

export function assertAllowedAppointmentImage(file: {
  type: string;
  size: number;
  name: string;
}): void {
  if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
    throw new Error("Choose a JPEG, PNG, or WebP image");
  }
  if (file.size > MAX_APPOINTMENT_IMAGE_BYTES) {
    throw new Error("Images must be 10 MB or smaller");
  }
}

function extensionFor(fileName: string): string {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  if (match && [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(match[1])) {
    return match[1] === ".jpeg" ? ".jpg" : match[1];
  }
  return ".jpg";
}

export function appointmentImageStoragePath(
  appointmentKey: string,
  fileName: string,
  id: string,
): string {
  const safeKey = appointmentKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safeKey}/${id}${extensionFor(fileName)}`;
}

export function publicUrlForAppointmentImage(storagePath: string): string {
  return supabase.storage.from(APPOINTMENT_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function listAppointmentImages(
  appointmentKey: string,
): Promise<AppointmentImage[]> {
  const { data, error } = await supabase
    .from("appointment_images")
    .select("id, appointment_key, storage_path, content_type, created_at")
    .eq("appointment_key", appointmentKey)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    appointmentKey: row.appointment_key,
    storagePath: row.storage_path,
    contentType: row.content_type,
    createdAt: row.created_at,
  }));
}

export async function uploadAppointmentImage(
  appointmentKey: string,
  file: File,
): Promise<AppointmentImage> {
  assertAllowedAppointmentImage(file);
  const id = crypto.randomUUID();
  const storagePath = appointmentImageStoragePath(appointmentKey, file.name, id);
  const { error: uploadError } = await supabase.storage
    .from(APPOINTMENT_IMAGES_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("appointment_images")
    .insert({
      appointment_key: appointmentKey,
      storage_path: storagePath,
      content_type: file.type,
    })
    .select("id, appointment_key, storage_path, content_type, created_at")
    .single();
  if (error) {
    await supabase.storage.from(APPOINTMENT_IMAGES_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return {
    id: data.id,
    appointmentKey: data.appointment_key,
    storagePath: data.storage_path,
    contentType: data.content_type,
    createdAt: data.created_at,
  };
}

export async function deleteAppointmentImage(image: AppointmentImage): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(APPOINTMENT_IMAGES_BUCKET)
    .remove([image.storagePath]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from("appointment_images").delete().eq("id", image.id);
  if (error) throw new Error(error.message);
}
