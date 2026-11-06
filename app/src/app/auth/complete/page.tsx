"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/explore";
}

/**
 * Finishes sign-in for links that carry the session in the URL fragment
 * (#access_token=…), e.g. older Supabase invite emails. Fragments never reach
 * the server, so this has to run in the browser.
 */
export default function CompleteSignInPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const hashError = hash.get("error_description");
    if (hashError) {
      void Promise.resolve().then(() => setError(hashError.replace(/\+/g, " ")));
      return;
    }
    if (!accessToken || !refreshToken) {
      window.location.replace(`/login?error=link_expired&next=${encodeURIComponent(next)}`);
      return;
    }
    createSupabaseBrowserClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: e }) => {
        if (e) setError(e.message);
        else window.location.replace(next);
      });
  }, []);

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16 text-center text-sm">
      {error ? (
        <div className="space-y-3">
          <p className="text-error">{error}</p>
          <a href="/login" className="inline-block rounded-lg bg-sidebar px-4 py-2 text-white">
            Request a new link
          </a>
        </div>
      ) : (
        <p className="text-text-muted">Signing you in…</p>
      )}
    </div>
  );
}
