import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { isPlatformAdminEmail } from "@/lib/firms/context";
import { findFirmsByEmailDomain, listMembershipsForEmail } from "@/lib/firms/repository";
import { getPendingInvitation } from "@/lib/onboarding/invitations";
import { badRequest, readJson } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const GENERIC_OK = {
  ok: true,
  message: "If your email has access to Smart Capture, a sign-in link is on its way.",
};

function selfSignupEnabled() {
  return process.env.ALLOW_SELF_SIGNUP === "1";
}

/** Only firm members, auto-join domains, invited prospects and platform admins receive a sign-in link. */
async function isEligible(email: string): Promise<boolean> {
  if (isPlatformAdminEmail(email) || selfSignupEnabled()) return true;
  if (!isDatabaseConfigured()) return false;
  const [memberships, domainFirms, invitation] = await Promise.all([
    listMembershipsForEmail(email),
    findFirmsByEmailDomain(email),
    getPendingInvitation(email),
  ]);
  return memberships.length > 0 || domainFirms.length > 0 || Boolean(invitation);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`magic:${ip}`, 5, 10 * 60_000);
  if (limited) return limited;

  const body = await readJson<{ email?: string; next?: string }>(request);
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Valid email required");

  const next = body?.next?.startsWith("/") && !body.next.startsWith("//") ? body.next : "/explore";

  try {
    if (!(await isEligible(email))) {
      logger.info("auth.magic_link.ineligible", { domain: email.split("@")[1] });
      return NextResponse.json(GENERIC_OK);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    });
    if (error) logger.warn("auth.magic_link.failed", { error: error.message });
  } catch (error) {
    logger.error("auth.magic_link.error", { error: error instanceof Error ? error.message : String(error) });
  }
  return NextResponse.json(GENERIC_OK);
}
