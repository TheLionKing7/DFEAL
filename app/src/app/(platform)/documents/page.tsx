"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DocRow {
  id: string;
  title: string | null;
  document_type: string;
  opportunity_id: string | null;
  created_at: string;
  content_text?: string | null;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [selected, setSelected] = useState<DocRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function openDoc(id: string) {
    const res = await fetch(`/api/documents?id=${id}`);
    const data = await res.json();
    setSelected(data.document ?? null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="mt-2 text-text-muted">
          AI-generated proposal sections saved from opportunity workspaces.
        </p>
      </div>

      {loading && <p className="text-sm text-text-muted">Loading…</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="space-y-2 rounded-xl border border-border bg-bg-surface p-4">
          {documents.length === 0 && !loading && (
            <li className="text-sm text-text-muted">
              No documents yet. Generate sections from an opportunity workspace.
            </li>
          )}
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => void openDoc(doc.id)}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-bg"
              >
                <p className="font-medium">{doc.title ?? doc.document_type}</p>
                <p className="text-xs text-text-muted">
                  {new Date(doc.created_at).toLocaleString()}
                  {doc.opportunity_id && (
                    <>
                      {" · "}
                      <Link
                        href={`/opportunities/${doc.opportunity_id}`}
                        className="text-gold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View opp
                      </Link>
                    </>
                  )}
                </p>
              </button>
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-border bg-bg-surface p-4">
          <h2 className="font-semibold">Preview</h2>
          {selected?.content_text ? (
            <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap text-xs text-text-muted">
              {selected.content_text}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-text-muted">Select a document to preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
