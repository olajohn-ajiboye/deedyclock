export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const SQUARE_BASE = "https://connect.squareup.com/v2";

export function squareErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const errors = (payload as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return fallback;
  const first = errors[0];
  if (!first || typeof first !== "object") return fallback;
  const detail = (first as { detail?: unknown }).detail;
  return typeof detail === "string" && detail !== "" ? detail : fallback;
}
