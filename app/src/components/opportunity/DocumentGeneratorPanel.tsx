"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/layout/PageShell";
import type { DocumentType } from "@/shared/document-types";
import { getDocumentTypeLabel } from "@/shared/document-types";
import { cn } from "@/shared/cn";

interface Recommendation {
  document_type: DocumentType;
  label: string;
  description: string;
  score: number;
  reason: string;
  recommended: boolean;
}

interface DocRow {
  id: string;
  title: string | null;
  document_type: string;
  created_at: string;
}

const btnPrimary =
  "rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white hover:bg-sidebar-surface disabled:opacity-60";
const btnSecondary =
  "rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium hover:border-gold/40 disabled:opacity-60";

export function DocumentGeneratorPanel({
  opportunityId,
  noticeType,
  docList,
  selectedDoc,
  loading,
  onGenerate,
  onLoadDocument,
  onCopy,
}: {
  opportunityId: string;
  noticeType: string;
  docList: DocRow[];
  selectedDoc: { id: string; content: string; title: string } | null;
  loading: string | null;
  onGenerate: (type: DocumentType) => void;
  onLoadDocument: (id: string) => void;
  onCopy: () => void;
}) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recLoading, setRecLoading] = useState(true);

  useEffect(() => {
    setRecLoading(true);
    void fetch(`/api/documents/recommend?opportunity_id=${opportunityId}`)
      .then((r) => r.json())
      .then((data) => setRecommendations(data.recommendations ?? []))
      .finally(() => setRecLoading(false));
  }, [opportunityId, noticeType]);

  const primary = recommendations[0];
  const recommended = recommendations.filter((r) => r.recommended);
  const others = recommendations.filter((r) => !r.recommended);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Smart document generator">
        <p className="mb-3 text-sm text-text-muted">
          Document types are matched to this opportunity&apos;s notice type and solicitation
          language. Drafts follow DFEAL templates and company profile conventions.
        </p>

        {recLoading && (
          <p className="text-sm text-text-muted">Analyzing opportunity requirements…</p>
        )}

        {!recLoading && primary && (
          <div className="mb-4 rounded-xl border border-gold/30 bg-gold/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Best match
            </p>
            <h3 className="mt-1 font-semibold text-text">{primary.label}</h3>
            <p className="mt-1 text-sm text-text-muted">{primary.reason}</p>
            <button
              type="button"
              onClick={() => onGenerate(primary.document_type)}
              disabled={loading?.startsWith("doc-")}
              className={cn(btnPrimary, "mt-3")}
            >
              {loading === `doc-${primary.document_type}`
                ? "Generating…"
                : `Generate ${primary.label}`}
            </button>
          </div>
        )}

        {!recLoading && recommended.length > 1 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Also recommended
            </p>
            <div className="space-y-2">
              {recommended.slice(1).map((rec) => (
                <DocumentTypeCard
                  key={rec.document_type}
                  rec={rec}
                  loading={loading}
                  onGenerate={onGenerate}
                  variant="recommended"
                />
              ))}
            </div>
          </div>
        )}

        {!recLoading && others.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Other document types
            </p>
            <div className="space-y-2">
              {others.map((rec) => (
                <DocumentTypeCard
                  key={rec.document_type}
                  rec={rec}
                  loading={loading}
                  onGenerate={onGenerate}
                  variant="default"
                />
              ))}
            </div>
          </div>
        )}

        {docList.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase text-text-muted">
              Generated for this opportunity
            </p>
            {docList.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onLoadDocument(doc.id)}
                  className="text-left font-medium text-gold hover:underline"
                >
                  {doc.title ?? getDocumentTypeLabel(doc.document_type)}
                </button>
                <span className="ml-2 text-xs text-text-muted">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Document preview">
        {selectedDoc?.content ? (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={onCopy}>
                Copy
              </button>
              <a
                href={`/api/documents/${selectedDoc.id}/download?format=pdf`}
                className={btnPrimary}
              >
                Download PDF
              </a>
            </div>
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
              {selectedDoc.content}
            </pre>
          </>
        ) : (
          <p className="text-sm text-text-muted">
            Select a document type above. The system will recommend the best match for this
            opportunity&apos;s notice type.
          </p>
        )}
      </Panel>
    </div>
  );
}

function DocumentTypeCard({
  rec,
  loading,
  onGenerate,
  variant,
}: {
  rec: Recommendation;
  loading: string | null;
  onGenerate: (type: DocumentType) => void;
  variant: "recommended" | "default";
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border p-3",
        variant === "recommended" ? "border-gold/25 bg-gold/[0.04]" : "border-border",
      )}
    >
      <div className="min-w-0">
        <p className="font-medium text-text">{rec.label}</p>
        <p className="mt-0.5 text-xs text-text-muted">{rec.description}</p>
        <p className="mt-1 text-xs text-gold/80">{rec.reason}</p>
      </div>
      <button
        type="button"
        onClick={() => onGenerate(rec.document_type)}
        disabled={loading === `doc-${rec.document_type}`}
        className={cn(btnSecondary, "shrink-0 text-xs")}
      >
        {loading === `doc-${rec.document_type}` ? "…" : "Generate"}
      </button>
    </div>
  );
}
