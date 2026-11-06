"use client";

import { useEffect } from "react";

/**
 * If Supabase lands the user anywhere other than /auth/complete with the
 * session in the URL fragment (e.g. the Site URL root when the redirect URL
 * isn't allow-listed), forward it so sign-in still completes.
 */
export function AuthHashForwarder() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (pathname === "/auth/complete") return;
    if (!/[#&](access_token|error_description)=/.test(hash)) return;
    window.location.replace(`/auth/complete?next=/explore${hash}`);
  }, []);
  return null;
}
