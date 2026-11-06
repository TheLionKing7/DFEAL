import type { FirmInvitationRow } from "@/lib/db/database.types";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { sendInviteEmail } from "@/lib/auth/sign-in-link";
import { getSiteUrl } from "@/lib/env";
import { SMART_CAPTURE } from "@/config/platform";

export type Invitation = FirmInvitationRow;

export function onboardingLink(email: string) {
  return `${getSiteUrl()}/login?next=${encodeURIComponent("/onboarding")}&email=${encodeURIComponent(email)}`;
}

/** Pending, unexpired workspace invitation for this email (if any). */
export async function getPendingInvitation(email: string): Promise<Invitation | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("firm_invitations")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listInvitations(): Promise<Invitation[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("firm_invitations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function deliverInvite(email: string, companyName: string | null, note: string | null): Promise<"email" | "manual"> {
  return sendInviteEmail({
    email,
    next: "/onboarding",
    subject: `You're invited to set up ${companyName ? `${companyName}'s` : "your"} ${SMART_CAPTURE.name} workspace`,
    intro: `You've been invited to ${SMART_CAPTURE.name}, AI-powered contract capture for federal, state, local, education and grant opportunities. Set up your workspace in a few minutes.`,
    note,
    cta: "Set up your workspace",
  });
}

export async function createInvitation(input: {
  email: string;
  companyName?: string | null;
  note?: string | null;
  invitedBy: string;
  expiresInDays?: number;
}): Promise<{ invitation: Invitation; delivery: "email" | "manual"; link: string }> {
  const email = input.email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  // One pending invite per email: refresh it instead of erroring.
  await supabase.from("firm_invitations").update({ status: "revoked" }).eq("email", email).eq("status", "pending");
  const { data, error } = await supabase
    .from("firm_invitations")
    .insert({
      email,
      company_name: input.companyName?.trim() || null,
      note: input.note?.trim() || null,
      invited_by: input.invitedBy,
      expires_at: new Date(Date.now() + (input.expiresInDays ?? 30) * 86_400_000).toISOString(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const delivery = await deliverInvite(email, data.company_name, data.note);
  return { invitation: data, delivery, link: onboardingLink(email) };
}

export async function revokeInvitation(id: string) {
  const { error } = await getSupabaseAdmin()
    .from("firm_invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}

export async function resendInvitation(id: string) {
  const { data } = await getSupabaseAdmin().from("firm_invitations").select("*").eq("id", id).maybeSingle();
  if (!data || data.status !== "pending") throw new Error("Invitation is not pending");
  return { delivery: await deliverInvite(data.email, data.company_name, data.note), link: onboardingLink(data.email) };
}

export async function markInvitationAccepted(id: string, firmId: string) {
  await getSupabaseAdmin()
    .from("firm_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), firm_id: firmId })
    .eq("id", id);
}
