import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

let admin: SupabaseClient<Database> | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!admin) {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ??
      process.env.SUPABASE_URL?.trim();
    if (!url) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) for database access",
      );
    }
    admin = createClient<Database>(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      process.env.SUPABASE_URL?.trim()) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}
