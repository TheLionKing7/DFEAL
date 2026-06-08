"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";
import { getAllowedEmailDomain, isAllowedTeamEmail } from "@/lib/auth/team-access";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "magic" | "password";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/explore";
  const allowedDomain = getAllowedEmailDomain();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("magic");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isAllowedTeamEmail(email)) {
      setError(`Use your @${allowedDomain} work email.`);
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "magic") {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: redirectTo },
        });
        if (otpError) throw otpError;
        setMessage("Check your inbox for a sign-in link.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        window.location.href = next;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">
          Team access
        </p>
        <h1 className="mt-2 text-2xl font-bold">{DFEAL_PROFILE.productName}</h1>
        <p className="mt-2 text-sm text-text-muted">
          Sign in with your DFEAL email to view scored opportunities.
        </p>

        <div className="mt-6 flex rounded-lg border border-border p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={`flex-1 rounded-md px-3 py-2 ${mode === "magic" ? "bg-sidebar text-white" : "text-text-muted"}`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex-1 rounded-md px-3 py-2 ${mode === "password" ? "bg-sidebar text-white" : "text-text-muted"}`}
          >
            Password
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={`you@${allowedDomain}`}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-gold"
            />
          </label>

          {mode === "password" && (
            <label className="block text-sm">
              <span className="font-medium">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-gold"
              />
            </label>
          )}

          {error && (
            <p className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sidebar px-4 py-2.5 text-sm font-medium text-white hover:bg-sidebar-surface disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : mode === "magic"
                ? "Send sign-in link"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-text-muted">
          Accounts are limited to @{allowedDomain}. Ask an admin to create your
          user in Supabase if you do not have access yet.
        </p>
      </div>
    </div>
  );
}
