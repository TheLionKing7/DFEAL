import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/sign-in-link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Handles every shape of Supabase auth redirect:
 * - ?token_hash&type  → confirm page (token redeemed on POST)
 * - ?code             → PKCE exchange (works in the requesting browser)
 * - #access_token     → fragment, finished client-side on /auth/complete
 * - ?error_description → shown on the login page
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const next = safeNextPath(searchParams.get("next"));

  const tokenHash = searchParams.get("token_hash");
  if (tokenHash) {
    const confirm = new URL(`${origin}/auth/confirm`);
    confirm.searchParams.set("token_hash", tokenHash);
    confirm.searchParams.set("type", searchParams.get("type") ?? "magiclink");
    confirm.searchParams.set("next", next);
    return NextResponse.redirect(confirm);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/login?error=link_other_browser&next=${encodeURIComponent(next)}`);
  }

  if (searchParams.get("error_description") || searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?error=link_expired&next=${encodeURIComponent(next)}`);
  }

  // No query credentials: the session may be in the URL fragment, which the
  // browser keeps across this redirect.
  return NextResponse.redirect(`${origin}/auth/complete?next=${encodeURIComponent(next)}`);
}
