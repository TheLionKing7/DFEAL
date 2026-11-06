"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FIRM_SECTIONS, type FirmSectionId } from "@/components/firm/FirmSections";
import { formToPayload, type FirmFormValues } from "@/lib/firms/form-values";
import type { FirmProfile } from "@/lib/firms/types";
import { cn } from "@/shared/cn";

/**
 * Firm profile editor. Holds the full form state so switching settings tabs
 * never loses edits; `sections` controls which parts are visible.
 */
export function FirmForm({
  mode,
  initial,
  sections,
  readOnly,
  onSaved,
  submitLabel,
}: {
  mode: "create" | "edit";
  initial: FirmFormValues;
  sections: FirmSectionId[];
  readOnly?: boolean;
  onSaved?: (result: { firm: FirmProfile; scored?: number }) => void;
  submitLabel?: string;
}) {
  const [v, setV] = useState<FirmFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const router = useRouter();

  const set = <K extends keyof FirmFormValues>(key: K, value: FirmFormValues[K]) => {
    setDirty(true);
    setV((prev) => ({ ...prev, [key]: value }));
  };
  const setMany = (patch: Partial<FirmFormValues>) => {
    setDirty(true);
    setV((prev) => ({ ...prev, ...patch }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    setErrors({});
    setStatus(null);
    try {
      const res = await fetch(mode === "create" ? "/api/firms" : "/api/firms/current", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(v)),
      });
      const data = (await res.json()) as {
        error?: string;
        details?: Record<string, string>;
        firm?: FirmProfile;
        scored?: number;
      };
      if (!res.ok || !data.firm) {
        setErrors(data.details ?? {});
        setStatus({ kind: "error", text: data.error ?? "Save failed" });
        return;
      }
      setDirty(false);
      setStatus({
        kind: "ok",
        text:
          mode === "create"
            ? `${data.firm.legalName} created — ${data.scored ?? 0} opportunities scored.`
            : `Saved — ${data.scored ?? 0} opportunities re-scored for your workspace.`,
      });
      onSaved?.({ firm: data.firm, scored: data.scored });
      // Sidebar lanes and other server-rendered firm data pick up the change.
      if (mode === "edit") router.refresh();
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  const props = { v, set, setMany, errors, readOnly };

  return (
    <form onSubmit={submit} className="space-y-6">
      {sections.map((id) => {
        const Section = FIRM_SECTIONS[id];
        return <Section key={id} {...props} />;
      })}

      {status && (
        <p
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            status.kind === "ok" ? "border-success/30 bg-success/5 text-success" : "border-error/30 bg-error/5 text-error",
          )}
        >
          {status.text}
          {status.kind === "error" && Object.keys(errors).length > 0 && (
            <span className="mt-1 block text-xs">
              {Object.entries(errors)
                .slice(0, 5)
                .map(([k, m]) => `${k}: ${m}`)
                .join(" · ")}
            </span>
          )}
        </p>
      )}

      {!readOnly && (
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-bg/90 py-3 backdrop-blur">
          {dirty && <span className="text-xs text-text-muted">Unsaved changes</span>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sidebar px-6 py-2.5 text-sm font-medium text-white hover:bg-sidebar-surface disabled:opacity-60"
          >
            {saving ? "Saving & re-scoring…" : submitLabel ?? (mode === "create" ? "Create workspace" : "Save changes")}
          </button>
        </div>
      )}
    </form>
  );
}
