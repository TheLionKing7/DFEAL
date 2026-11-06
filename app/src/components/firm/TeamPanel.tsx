"use client";

import { useState } from "react";
import type { FirmRole } from "@/lib/firms/types";

export interface TeamMember {
  id: string;
  email: string;
  role: FirmRole;
  user_id: string | null;
  name?: string | null;
}

const ROLE_HELP: Record<FirmRole, string> = {
  owner: "Full control, including other owners",
  admin: "Edit profile, workspace, team and integrations",
  member: "Use the workspace, assistant and automations",
};

export function TeamPanel({
  initialMembers,
  canManage,
  isOwner,
  currentEmail,
}: {
  initialMembers: TeamMember[];
  canManage: boolean;
  isOwner: boolean;
  currentEmail: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FirmRole>("member");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(method: "POST" | "DELETE", body?: object, query?: string, successText?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/firms/current/members${query ?? ""}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { members?: TeamMember[]; error?: string; invite?: string; details?: Record<string, string> };
      if (!res.ok) throw new Error(data.details ? Object.values(data.details)[0] : data.error ?? "Request failed");
      if (data.members) setMembers(data.members);
      setMessage({
        ok: true,
        text:
          successText ??
          (data.invite === "invited" ? "Invitation email sent." : "Saved — they can sign in with a magic link using this email."),
      });
      return true;
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Request failed" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-bg text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => {
              const self = m.email === currentEmail;
              const editable = canManage && !self && (m.role !== "owner" || isOwner);
              return (
                <tr key={m.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{m.name || m.email}</p>
                    {m.name && <p className="text-xs text-text-muted">{m.email}</p>}
                    {self && <p className="text-xs text-text-muted">You</p>}
                  </td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <select
                        value={m.role}
                        disabled={busy}
                        onChange={(e) => void call("POST", { email: m.email, role: e.target.value }, undefined, "Role updated.")}
                        className="rounded-md border border-border px-2 py-1 text-xs"
                        title={ROLE_HELP[m.role]}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        {isOwner && <option value="owner">Owner</option>}
                      </select>
                    ) : (
                      <span className="rounded-full bg-bg px-2 py-0.5 text-xs capitalize text-text-muted" title={ROLE_HELP[m.role]}>
                        {m.role}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {m.user_id ? <span className="text-success">Active</span> : <span className="text-gold">Invited</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editable && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Remove ${m.email} from this workspace?`)) {
                            void call("DELETE", undefined, `?email=${encodeURIComponent(m.email)}`, "Member removed.");
                          }
                        }}
                        className="text-xs text-text-muted hover:text-error"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void call("POST", { email, role }).then((ok) => ok && setEmail(""));
          }}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3"
        >
          <label className="min-w-[14rem] flex-1">
            <span className="text-xs font-medium">Add people to this workspace</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@yourfirm.com"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-gold"
            />
          </label>
          <select value={role} onChange={(e) => setRole(e.target.value as FirmRole)} className="rounded-lg border border-border px-3 py-2">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            {isOwner && <option value="owner">Owner</option>}
          </select>
          <button type="submit" disabled={busy} className="rounded-lg bg-sidebar px-4 py-2 font-medium text-white hover:bg-sidebar-surface disabled:opacity-60">
            Send invite
          </button>
          <p className="w-full text-xs text-text-muted">{ROLE_HELP[role]}.</p>
        </form>
      ) : (
        <p className="text-xs text-text-muted">Only workspace admins and owners can add or remove people.</p>
      )}
      {message && <p className={message.ok ? "text-xs text-success" : "text-xs text-error"}>{message.text}</p>}
    </div>
  );
}
