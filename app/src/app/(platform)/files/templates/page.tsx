"use client";

import { useEffect, useState } from "react";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import type { DocumentType } from "@/shared/document-types";

interface TemplateMeta {
  id: DocumentType;
  label: string;
  description: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selected, setSelected] = useState<TemplateMeta | null>(null);
  const [outline, setOutline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/documents/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates ?? []);
        if (data.templates?.[0]) setSelected(data.templates[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setOutline(null);
    void fetch(`/api/documents/templates?type=${selected.id}`)
      .then((r) => r.json())
      .then((data) => setOutline(data.outline ?? null));
  }, [selected]);

  return (
    <PageShell>
      <PageHeader
        title="Proposal templates"
        description="DFEAL document structures used by the AI generator. Each draft follows these outlines with live company profile data."
      />

      {loading && <p className="text-sm text-text-muted">Loading templates…</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Document types">
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelected(t)}
                  className={`w-full rounded-lg px-3 py-2 text-left ${
                    selected?.id === t.id
                      ? "bg-gold/10 font-medium text-gold"
                      : "hover:bg-bg"
                  }`}
                >
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-text-muted">{t.description}</p>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={selected ? `${selected.label} structure` : "Template outline"}>
          {outline ? (
            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-text-muted">
              {outline}
            </pre>
          ) : (
            <p className="text-sm text-text-muted">Select a document type to view its template.</p>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
