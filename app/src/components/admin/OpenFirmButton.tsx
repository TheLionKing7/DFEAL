"use client";

import { useState } from "react";

export function OpenFirmButton({ firmId }: { firmId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/firms/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firm_id: firmId }),
        });
        if (res.ok) window.location.assign("/explore");
        else setBusy(false);
      }}
      className="block w-full text-right text-xs text-gold hover:underline disabled:opacity-50"
    >
      {busy ? "Opening…" : "Open workspace"}
    </button>
  );
}
