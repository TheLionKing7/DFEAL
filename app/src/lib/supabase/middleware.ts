import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/auth/magic-link", "/setup-required"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  // Cron routes authenticate with CRON_SECRET instead of a session.
  if (pathname.startsWith("/api/cron/")) return true;
  // Token-authenticated calendar feeds (calendar apps send no cookies).
  if (pathname.startsWith("/api/calendar/")) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Supabase falls back to the Site URL root (e.g. "/?code=…") when the
  // requested redirect is not on its allow-list. Route any stray auth code
  // through the callback so the session is still established.
  const authCode = request.nextUrl.searchParams.get("code");
  if (authCode && pathname !== "/auth/callback" && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.search = "";
    url.searchParams.set("code", authCode);
    url.searchParams.set("next", pathname === "/" || pathname === "/login" ? "/explore" : pathname);
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/explore";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/explore";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
