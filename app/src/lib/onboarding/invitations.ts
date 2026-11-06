import type { FirmInvitationRow } from "@/lib/db/database.types";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { sendPlatformEmail } from "@/lib/connectors/deliver";
import { getSiteUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
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

async function deliverInvite(email: string, companyName: string | null, note: string | null): Promise<"email" | "supabase" | "manual"> {
  const link = onboardingLink(email);
  // Prefer the Supabase invite (creates the login and emails a one-click link).
  try {
    const { error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
      data: { invited_company: companyName ?? undefined },
    });
    if (!error) return "supabase";
    if (!/already (been )?registered|already exists/i.test(error.message)) {
      logger.warn("invite.supabase_failed", { error: error.message });
    }
  } catch (error) {
    logger.warn("invite.supabase_failed", { error: error instanceof Error ? error.message : String(error) });
  }
  // Existing user (or Supabase mail unavailable): send our own email if possible.
  try {
    await sendPlatformEmail(
      [email],
      `You're invited to set up ${companyName ? `${companyName}'s` : "your"} ${SMART_CAPTURE.name} workspace`,
      `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1a2332">
        <p>You've been invited to ${SMART_CAPTURE.name} — AI-powered contract capture for federal, state, local and grant opportunities.</p>
        ${note ? `<p style="padding:12px;background:#f7f6f3;border-radius:8px">${note.replace(/</g, "&lt;")}</p>` : ""}
        <p><a href="${link}" style="display:inline-block;background:#0f2744;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Set up your workspace →</a></p>
        <p style="font-size:12px;color:#64748b">Sign in with this email address (${email}) to continue.</p>
      </div>`,
    );
    return "email";
  } catch {
    return "manual";
  }
}

export async function createInvitation(input: {
  email: string;
  companyName?: string | null;
  note?: string | null;
  invitedBy: string;
  expiresInDays?: number;
}): Promise<{ invitation: Invitation; delivery: "email" | "supabase" | "manual"; link: string }> {
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
