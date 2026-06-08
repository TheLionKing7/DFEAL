"use client";

import { useState } from "react";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";

export default function EntityPage() {
  const [uei, setUei] = useState(DFEAL_PROFILE.uei);
  const [cage, setCage] = useState(DFEAL_PROFILE.cage);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (uei.trim()) params.set("uei", uei.trim());
      if (cage.trim()) params.set("cage", cage.trim());
      const res = await fetch(`/api/entity?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SAM entity lookup</h1>
        <p className="mt-2 text-text-muted">
          Verify vendor registration status via SAM.gov Entity API.
        </p>
      </div>

      <form onSubmit={lookup} className="space-y-4 rounded-xl border border-border bg-bg-surface p-6">
        <label className="block text-sm">
          <span className="font-medium">UEI</span>
          <input
            value={uei}
            onChange={(e) => setUei(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">CAGE code</span>
          <input
            value={cage}
            onChange={(e) => setCage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Looking up…" : "Lookup entity"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {result && (
        <pre className="overflow-auto rounded-xl border border-border bg-bg-surface p-4 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
