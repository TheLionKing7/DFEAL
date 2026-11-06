import { NextResponse, type NextRequest } from "next/server";
import { VERIFY_TYPES, safeNextPath, type VerifyType } from "@/lib/auth/sign-in-link";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Redeems a one-time sign-in token (from /auth/confirm) and sets the session cookies. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const tokenHash = String(form?.get("token_hash") ?? "");
  const type = String(form?.get("type") ?? "");
  const next = safeNextPath(String(form?.get("next") ?? ""));
  const origin = request.nextUrl.origin;

  if (tokenHash && (VERIFY_TYPES as readonly string[]).includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as VerifyType });
    if (!error) return NextResponse.redirect(`${origin}${next}`, 303);
    logger.info("auth.verify_failed", { error: error.message });
  }
  return NextResponse.redirect(`${origin}/login?error=link_expired&next=${encodeURIComponent(next)}`, 303);
}
