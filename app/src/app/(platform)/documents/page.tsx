"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { getDocumentTypeLabel } from "@/shared/document-types";

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
    <PageShell>
      <PageHeader
        title="Documents"
        description="AI-generated capability statements, RFI responses, and proposals saved from opportunity workspaces."
      />

      {loading && <p className="text-sm text-text-muted">Loading…</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
        <ul className="space-y-2">
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
                <p className="font-medium">
                  {doc.title ?? getDocumentTypeLabel(doc.document_type)}
                </p>
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
        </Panel>
        <Panel title="Preview">
          {selected?.content_text ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-gold/40"
                  onClick={() => navigator.clipboard.writeText(selected.content_text ?? "")}
                >
                  Copy
                </button>
                <a
                  href={`/api/documents/${selected.id}/download?format=pdf`}
                  className="rounded-lg bg-sidebar px-3 py-1.5 text-xs font-medium text-white hover:bg-sidebar-surface"
                >
                  Download PDF
                </a>
              </div>
              <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-text-muted">
                {selected.content_text}
              </pre>
            </>
          ) : (
            <p className="mt-3 text-sm text-text-muted">Select a document to preview.</p>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
