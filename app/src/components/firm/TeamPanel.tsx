"use client";

import { useState } from "react";
import type { FirmRole } from "@/lib/firms/types";

interface Member {
  id: string;
  email: string;
  role: FirmRole;
  user_id: string | null;
}

export function TeamPanel({
  initialMembers,
  canManage,
  currentEmail,
}: {
  initialMembers: Member[];
  canManage: boolean;
  currentEmail: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FirmRole>("member");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(method: "POST" | "DELETE", body?: object, query?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/firms/current/members${query ?? ""}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { members?: Member[]; error?: string; invite?: string; details?: Record<string, string> };
      if (!res.ok) throw new Error(data.details ? Object.values(data.details)[0] : data.error ?? "Request failed");
      if (data.members) setMembers(data.members);
      if (method === "POST") {
        setEmail("");
        setMessage(data.invite === "invited" ? "Invite email sent." : "Member saved — they can sign in with a magic link.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1 truncate">
              {m.email}
              {m.email === currentEmail && <span className="ml-2 text-xs text-text-muted">(you)</span>}
            </span>
            <span className="rounded-full bg-bg px-2 py-0.5 text-xs capitalize text-text-muted">{m.role}</span>
            {canManage && m.email !== currentEmail && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void call("DELETE", undefined, `?email=${encodeURIComponent(m.email)}`)}
                className="text-xs text-text-muted hover:text-error"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void call("POST", { email, role });
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="min-w-[14rem] flex-1">
            <span className="text-xs font-medium">Invite by email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@yourfirm.com"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-gold"
            />
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as FirmRole)}
            className="rounded-lg border border-border px-3 py-2"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-sidebar px-4 py-2 font-medium text-white hover:bg-sidebar-surface disabled:opacity-60"
          >
            Add
          </button>
        </form>
      )}
      {message && <p className="text-xs text-text-muted">{message}</p>}
    </div>
  );
}
