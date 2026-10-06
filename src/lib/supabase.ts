import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { ServiceRequest } from "./request-schema";

export async function persistRequest(input: ServiceRequest): Promise<string> {
  // Read lazily so the static page can build without production secrets.
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Database configuration unavailable");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client
    .from("service_requests")
    .insert({ full_name: input.fullName, email: input.email, service: input.service, description: input.description })
    .select("id")
    .abortSignal(AbortSignal.timeout(8000))
    .single();

  if (error || !data?.id || typeof data.id !== "string") {
    throw new Error("Database insert not confirmed");
  }
  return data.id;
}
