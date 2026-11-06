import "server-only";
import { SMART_CAPTURE } from "@/config/platform";
import { sendPlatformEmail } from "@/lib/connectors/deliver";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { getSiteUrl } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Sign-in links that work in any browser.
 *
 * Supabase's default email flow (PKCE) only completes in the browser that
 * requested the link and is sent through Supabase's rate-limited mailer.
 * Instead we mint a one-time token with the admin API, send it ourselves
 * (Resend), and verify it server-side on /auth/verify after the user clicks
 * "Continue" on /auth/confirm — so link scanners that pre-open URLs cannot
 * consume the token.
 */

export const VERIFY_TYPES = ["magiclink", "invite", "signup", "email", "recovery"] as const;
export type VerifyType = (typeof VERIFY_TYPES)[number];

export function safeNextPath(value: string | null | undefined, fallback = "/explore"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

async function generate(email: string) {
  const admin = getSupabaseAdmin().auth.admin;
  let res = await admin.generateLink({ type: "magiclink", email });
  if (res.error) {
    // No auth user yet: create one, then mint the link.
    const created = await admin.createUser({ email, email_confirm: true });
    if (created.error && !/already/i.test(created.error.message)) throw new Error(created.error.message);
    res = await admin.generateLink({ type: "magiclink", email });
  }
  if (res.error || !res.data.properties?.hashed_token) {
    throw new Error(res.error?.message ?? "Could not generate sign-in link");
  }
  return { tokenHash: res.data.properties.hashed_token, type: (res.data.properties.verification_type || "magiclink") as VerifyType };
}

/** One-time sign-in URL (valid for the Supabase OTP lifetime, 1 hour by default). */
export async function createSignInUrl(email: string, next: string): Promise<string> {
  const { tokenHash, type } = await generate(email.trim().toLowerCase());
  const url = new URL(`${getSiteUrl()}/auth/confirm`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", safeNextPath(next));
  return url.toString();
}

export function loginUrl(email: string, next: string) {
  return `${getSiteUrl()}/login?next=${encodeURIComponent(safeNextPath(next))}&email=${encodeURIComponent(email)}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#0f2744;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${esc(label)}</a></p>`;
}

function wrap(body: string) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#1a2332;max-width:560px">
  <p style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#b8902f">${esc(SMART_CAPTURE.name)}</p>
  ${body}
</div>`;
}

export type LinkDelivery = "email" | "manual";

/** Email a sign-in link. Throws only if both minting and sending fail. */
export async function sendSignInEmail(email: string, next: string): Promise<LinkDelivery> {
  const url = await createSignInUrl(email, next);
  try {
    await sendPlatformEmail(
      [email],
      `Your ${SMART_CAPTURE.name} sign-in link`,
      wrap(`<p>Use the button below to sign in as <strong>${esc(email)}</strong>.</p>
        ${button(url, `Sign in to ${SMART_CAPTURE.name}`)}
        <p style="font-size:12px;color:#64748b">This link works once and expires in 1 hour. If it has expired, request a new one at <a href="${esc(loginUrl(email, next))}">${esc(getSiteUrl())}/login</a>. If you didn't ask to sign in, ignore this email.</p>`),
    );
    return "email";
  } catch (error) {
    logger.warn("auth.sign_in_email_failed", { error: error instanceof Error ? error.message : String(error) });
    return "manual";
  }
}

/** Email a workspace invitation with a one-click sign-in link. */
export async function sendInviteEmail(input: {
  email: string;
  next: string;
  subject: string;
  intro: string;
  note?: string | null;
  cta: string;
}): Promise<LinkDelivery> {
  try {
    const url = await createSignInUrl(input.email, input.next);
    await sendPlatformEmail(
      [input.email],
      input.subject,
      wrap(`<p>${esc(input.intro)}</p>
        ${input.note ? `<p style="padding:12px;background:#f7f6f3;border-radius:8px">${esc(input.note)}</p>` : ""}
        ${button(url, input.cta)}
        <p style="font-size:12px;color:#64748b">The button signs you in as ${esc(input.email)} and works once within 1 hour. After that, use <a href="${esc(loginUrl(input.email, input.next))}">this link</a> to get a fresh sign-in email.</p>`),
    );
    return "email";
  } catch (error) {
    logger.warn("auth.invite_email_failed", { error: error instanceof Error ? error.message : String(error) });
    return "manual";
  }
}
