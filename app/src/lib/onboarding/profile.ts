import { z } from "zod";
import type { UserProfileRow } from "@/lib/db/database.types";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export const profileInputSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  jobTitle: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  timezone: z.string().trim().max(60).optional().default(""),
});

export type ProfileInput = z.input<typeof profileInputSchema>;

export async function getUserProfile(email: string): Promise<UserProfileRow | null> {
  const { data } = await getSupabaseAdmin().from("user_profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
  return data;
}

export async function upsertUserProfile(email: string, userId: string | null, input: z.output<typeof profileInputSchema>) {
  const { data, error } = await getSupabaseAdmin()
    .from("user_profiles")
    .upsert(
      {
        email: email.toLowerCase(),
        user_id: userId,
        full_name: input.fullName,
        job_title: input.jobTitle || null,
        phone: input.phone || null,
        timezone: input.timezone || null,
      },
      { onConflict: "email" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Display names for a list of emails (team panels). */
export async function profileNames(emails: string[]): Promise<Record<string, string>> {
  if (emails.length === 0) return {};
  const { data } = await getSupabaseAdmin()
    .from("user_profiles")
    .select("email, full_name, job_title")
    .in("email", emails.map((e) => e.toLowerCase()));
  return Object.fromEntries(
    (data ?? []).filter((p) => p.full_name).map((p) => [p.email, p.job_title ? `${p.full_name} · ${p.job_title}` : p.full_name!]),
  );
}
