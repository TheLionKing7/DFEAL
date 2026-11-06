"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  REFERENCE_ACCEPT,
  REFERENCE_DOC_TYPES,
  REFERENCE_MAX_BYTES,
  referenceDocLabel,
  type ReferenceDocType,
  type ReferenceDocument,
} from "@/lib/documents/reference-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/shared/cn";

const field = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold";

function guessType(name: string): ReferenceDocType {
  const n = name.toLowerCase();
  if (n.includes("capab")) return "capability_statement";
  if (n.includes("rfi")) return "rfi_response";
  if (n.includes("sources") || n.includes("sought")) return "sources_sought";
  if (n.includes("resume") || n.includes("cv")) return "resume";
  if (n.includes("cpars") || n.includes("past perf")) return "past_performance";
  if (n.includes("proposal") || n.includes("volume")) return "past_proposal";
  if (n.includes("template")) return "template";
  return "other";
}

export function ReferenceDocumentsManager({ currentEmail }: { currentEmail: string }) {
  const [docs, setDocs] = useState<ReferenceDocument[]>([]);
  const [canManageAll, setCanManageAll] = useState(false);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [files, setFiles] = useState<File[]>([]);
  const [meta, setMeta] = useState({ title: "", docType: "other" as ReferenceDocType, notes: "", text: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/reference-documents");
    const data = (await res.json()) as { documents?: ReferenceDocument[]; canManage?: boolean };
    setDocs(data.documents ?? []);
    setCanManageAll(Boolean(data.canManage));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function pick(list: FileList | null) {
    const chosen = [...(list ?? [])].filter((f) => /\.(pdf|docx|txt|md)$/i.test(f.name));
    if (chosen.length === 0) {
      setMsg({ ok: false, text: "Choose PDF, DOCX, TXT or Markdown files." });
      return;
    }
    setFiles(chosen);
    if (chosen.length === 1) {
      setMeta((m) => ({ ...m, title: m.title || chosen[0].name.replace(/\.[^.]+$/, ""), docType: guessType(chosen[0].name) }));
    }
    setMsg(null);
  }

  async function uploadOne(file: File, title: string, docType: ReferenceDocType) {
    if (file.size > REFERENCE_MAX_BYTES) throw new Error(`${file.name} is larger than 25 MB`);
    const target = await fetch("/api/reference-documents/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, size: file.size }),
    });
    const t = (await target.json()) as { path?: string; token?: string; error?: string };
    if (!target.ok || !t.path || !t.token) throw new Error(t.error ?? "Could not start upload");
    const { error } = await createSupabaseBrowserClient()
      .storage.from("firm-files")
      .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const res = await fetch("/api/reference-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        docType,
        notes: meta.notes || undefined,
        upload: { path: t.path, fileName: file.name, mimeType: file.type },
      }),
    });
    const data = (await res.json()) as { error?: string; details?: Record<string, string> };
    if (!res.ok) throw new Error(data.details ? Object.values(data.details)[0] : data.error ?? "Could not read document");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("upload");
    setMsg(null);
    try {
      if (mode === "text") {
        const res = await fetch("/api/reference-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: meta.title || "Pasted reference", docType: meta.docType, notes: meta.notes || undefined, text: meta.text }),
        });
        const data = (await res.json()) as { error?: string; details?: Record<string, string> };
        if (!res.ok) throw new Error(data.details ? Object.values(data.details)[0] : data.error ?? "Save failed");
      } else {
        if (files.length === 0) throw new Error("Choose a file first");
        for (const f of files) {
          setBusy(`upload:${f.name}`);
          await uploadOne(
            f,
            files.length === 1 ? meta.title || f.name.replace(/\.[^.]+$/, "") : f.name.replace(/\.[^.]+$/, ""),
            files.length === 1 ? meta.docType : guessType(f.name),
          );
        }
      }
      setMsg({ ok: true, text: mode === "text" ? "Reference saved." : `${files.length} document(s) uploaded and read.` });
      setFiles([]);
      setMeta({ title: "", docType: "other", notes: "", text: "" });
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setBusy(null);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    const res = await fetch(`/api/reference-documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) setMsg({ ok: false, text: ((await res.json()) as { error?: string }).error ?? "Update failed" });
    setBusy(null);
    await load();
  }

  async function remove(d: ReferenceDocument) {
    if (!window.confirm(`Delete "${d.title}"? The agents will stop using it.`)) return;
    setBusy(d.id);
    const res = await fetch(`/api/reference-documents/${d.id}`, { method: "DELETE" });
    if (!res.ok) setMsg({ ok: false, text: ((await res.json()) as { error?: string }).error ?? "Delete failed" });
    setBusy(null);
    await load();
  }

  return (
    <div className="space-y-5 text-sm">
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-dashed border-border p-4">
        <div className="flex gap-2 text-xs">
          {(["file", "text"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn("rounded-full border px-3 py-1", mode === m ? "border-gold bg-gold/10" : "border-border text-text-muted")}
            >
              {m === "file" ? "Upload files" : "Paste text"}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center",
              dragging ? "border-gold bg-gold/5" : "border-border hover:border-gold/50",
            )}
          >
            <input ref={inputRef} type="file" multiple accept={REFERENCE_ACCEPT} className="hidden" onChange={(e) => pick(e.target.files)} />
            <p className="font-medium">{files.length ? files.map((f) => f.name).join(", ") : "Drop files here or click to choose"}</p>
            <p className="mt-1 text-xs text-text-muted">PDF, DOCX, TXT or Markdown · up to 25 MB each · text-based PDFs (scans need OCR)</p>
          </div>
        ) : (
          <textarea
            rows={8}
            className={field}
            placeholder="Paste boilerplate, a past response, win themes or a style guide…"
            value={meta.text}
            onChange={(e) => setMeta({ ...meta, text: e.target.value })}
          />
        )}

        {(mode === "text" || files.length <= 1) && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              Title
              <input className={field} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            </label>
            <label className="text-xs">
              Document type
              <select className={field} value={meta.docType} onChange={(e) => setMeta({ ...meta, docType: e.target.value as ReferenceDocType })}>
                {REFERENCE_DOC_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Note for the agents (optional)
              <input
                className={field}
                placeholder="e.g. Our strongest VA past performance"
                value={meta.notes}
                onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
              />
            </label>
          </div>
        )}
        {mode === "file" && files.length > 1 && (
          <p className="text-xs text-text-muted">Multiple files: titles come from file names and types are detected automatically — adjust them below after upload.</p>
        )}

        <button disabled={Boolean(busy)} className="rounded-lg bg-sidebar px-4 py-2 text-xs font-medium text-white disabled:opacity-60">
          {busy?.startsWith("upload") ? (busy.includes(":") ? `Reading ${busy.split(":")[1]}…` : "Saving…") : mode === "file" ? "Upload & read" : "Save reference"}
        </button>
        {msg && <p className={msg.ok ? "text-xs text-success" : "text-xs text-error"}>{msg.text}</p>}
      </form>

      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id} className={cn("rounded-lg border p-3", d.use_for_drafting ? "border-border" : "border-border opacity-70")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{d.title}</span>
              <span className="rounded bg-bg px-1.5 py-0.5 text-[10px] uppercase text-text-muted">{referenceDocLabel(d.doc_type)}</span>
              <span className="text-[11px] text-text-muted">
                {d.char_count.toLocaleString()} chars{d.file_name ? ` · ${d.file_name}` : " · pasted"} · {d.uploaded_by} · {new Date(d.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-text-muted">{d.excerpt}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={d.use_for_drafting}
                  disabled={busy === d.id}
                  onChange={(e) => void patch(d.id, { useForDrafting: e.target.checked })}
                />
                Use when drafting
              </label>
              <select
                className="rounded border border-border px-1.5 py-0.5"
                value={d.doc_type}
                disabled={busy === d.id}
                onChange={(e) => void patch(d.id, { docType: e.target.value })}
              >
                {REFERENCE_DOC_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {d.file_name && (
                <a href={`/api/reference-documents/${d.id}`} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                  Download
                </a>
              )}
              {(canManageAll || d.uploaded_by === currentEmail) && (
                <button type="button" onClick={() => void remove(d)} className="ml-auto text-text-muted hover:text-error">
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="rounded-lg border border-gold/30 bg-gold/[0.04] p-4 text-xs">
            No reference documents yet. Upload your capability statement, two or three winning proposals or RFI responses,
            key resumes and any boilerplate — the drafting agents use them to write in your voice with your real facts.
          </li>
        )}
      </ul>
    </div>
  );
}
