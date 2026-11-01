"use client";

import { useState } from "react";

export function FirmStatusButton({ firmId, status }: { firmId: string; status: "active" | "suspended" }) {
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);
  const next = current === "active" ? "suspended" : "active";

  async function toggle() {
    if (next === "suspended" && !window.confirm("Suspend this firm? Its users lose access and it stops being scored.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/firms/${firmId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) setCurrent(next);
    setBusy(false);
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      className={current === "active" ? "text-xs text-text-muted hover:text-error" : "text-xs text-success hover:underline"}
    >
      {current === "active" ? "Suspend" : "Reactivate"}
    </button>
  );
}
