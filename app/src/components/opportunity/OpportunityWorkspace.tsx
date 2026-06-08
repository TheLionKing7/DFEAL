"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceTabs, type WorkspaceTab } from "@/components/opportunity/WorkspaceTabs";
import {
  DOCUMENT_TYPES,
  PURSUIT_STAGES,
  type DocumentType,
  type PursuitStage,
} from "@/shared/opportunity-lanes";
import { cn } from "@/shared/cn";
import type { Opportunity } from "@/shared/types/opportunity";

interface ScoreData {
  fit_score: number;
  go_no_go: string;
  rationale: string;
}

interface AnalysisData {
  fit_score: number;
  go_no_go: string;
  summary: string;
  strengths: string[];
  risks: string[];
  recommended_actions: string[];
  teaming_notes: string;
  provider: string;
  created_at?: string;
}

interface PursuitData {
  pursuit_stage: PursuitStage;
  notes: string | null;
}

interface DocumentData {
  id: string;
  title: string | null;
  document_type: string;
  created_at: string;
}

interface ComplianceData {
  pass_count: number;
  fail_count: number;
  summary: string;
  items: { section: string; requirement: string; status: string; notes: string }[];
}

export function OpportunityWorkspace({
  opportunity,
  score,
  pursuit,
  analyses,
  documents,
  complianceRuns,
}: {
  opportunity: Opportunity;
  score: ScoreData | null;
  pursuit: PursuitData | null;
  analyses: AnalysisData[];
  documents: DocumentData[];
  complianceRuns: ComplianceData[];
}) {
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [onPursuit, setOnPursuit] = useState(Boolean(pursuit));
  const [pursuitStage, setPursuitStage] = useState<PursuitStage>(
    pursuit?.pursuit_stage ?? "tracking",
  );
  const [pursuitNotes, setPursuitNotes] = useState(pursuit?.notes ?? "");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(analyses[0] ?? null);
  const [docList, setDocList] = useState(documents);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; content: string; title: string } | null>(null);
  const [compliance, setCompliance] = useState<ComplianceData | null>(complianceRuns[0] ?? null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalyze() {
    setLoading("analyze");
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
      setTab("analyze");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(null);
    }
  }

  async function togglePursuit() {
    setLoading("pursuit");
    setError(null);
    try {
      if (onPursuit) {
        await fetch(`/api/watchlist?opportunity_id=${opportunity.id}`, { method: "DELETE" });
        setOnPursuit(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunity_id: opportunity.id }),
        });
        setOnPursuit(true);
        setTab("pursuit");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pursuit update failed");
    } finally {
      setLoading(null);
    }
  }

  async function savePursuit() {
    setLoading("pursuit-save");
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: opportunity.id,
          pursuit_stage: pursuitStage,
          notes: pursuitNotes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(null);
    }
  }

  async function generateDocument(documentType: DocumentType) {
    setLoading(`doc-${documentType}`);
    setError(null);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: opportunity.id,
          document_type: documentType,
          analysis_summary: analysis?.summary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setDocList((prev) => [data.document, ...prev]);
      setSelectedDoc({
        id: data.document.id,
        title: data.document.title,
        content: data.document.content_text,
      });
      setTab("documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(null);
    }
  }

  async function loadDocument(id: string) {
    setLoading("doc-load");
    try {
      const res = await fetch(`/api/documents?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed");
      setSelectedDoc({
        id: data.document.id,
        title: data.document.title,
        content: data.document.content_text,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(null);
    }
  }

  async function runCompliance() {
    setLoading("compliance");
    setError(null);
    try {
      const res = await fetch("/api/compliance/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: opportunity.id,
          document_id: selectedDoc?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Compliance check failed");
      setCompliance(data.result);
      setTab("compliance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compliance check failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/explore" className="text-sm text-text-muted hover:text-gold">
            ← Back to explore
          </Link>
          <h1 className="mt-2 text-xl font-bold leading-snug lg:text-2xl">{opportunity.title}</h1>
          <p className="mt-2 text-sm text-text-muted">
            {opportunity.agency_name ?? "Agency TBD"}
            {opportunity.naics ? ` · NAICS ${opportunity.naics}` : ""}
            {opportunity.response_deadline
              ? ` · Due ${new Date(opportunity.response_deadline).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runAnalyze()}
            disabled={loading === "analyze"}
            className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading === "analyze" ? "Analyzing…" : "Run AI analysis"}
          </button>
          <button
            type="button"
            onClick={() => void togglePursuit()}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium",
              onPursuit
                ? "border-gold bg-gold/10 text-gold"
                : "border-border hover:border-gold/40",
            )}
          >
            {onPursuit ? "In pursuits" : "Start pursuit"}
          </button>
          {opportunity.sam_url && (
            <a
              href={opportunity.sam_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-gold/40"
            >
              SAM.gov ↗
            </a>
          )}
        </div>
      </div>

      {(score || analysis) && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-bg-surface p-4">
          <Badge label="Score" value={String(analysis?.fit_score ?? score?.fit_score ?? "—")} />
          <Badge
            label="Go / No-go"
            value={(analysis?.go_no_go ?? score?.go_no_go ?? "—").replace("_", " ")}
          />
          {onPursuit && (
            <Badge label="Pursuit stage" value={pursuitStage.replace("_", " ")} />
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <WorkspaceTabs active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-surface p-6">
          <h2 className="font-semibold">Solicitation overview</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Notice #" value={opportunity.external_id} />
            <Field label="Set-aside" value={opportunity.set_aside ?? "Unrestricted"} />
            <Field label="PSC" value={opportunity.psc ?? "—"} />
            <Field label="Est. value" value={formatValue(opportunity.estimated_value_usd)} />
            <Field label="Posted" value={formatDate(opportunity.posted_date)} />
            <Field label="Response due" value={formatDate(opportunity.response_deadline)} />
          </dl>
          <div>
            <h3 className="text-sm font-semibold">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">
              {opportunity.description ?? "No description available."}
            </p>
          </div>
          {score && (
            <div className="rounded-lg bg-bg p-4 text-sm">
              <p className="font-medium">Daily profile score</p>
              <p className="mt-1 text-text-muted">{score.rationale}</p>
            </div>
          )}
        </div>
      )}

      {tab === "analyze" && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-surface p-6">
          {!analysis ? (
            <div className="text-center">
              <p className="text-sm text-text-muted">
                Run AI analysis for a detailed go/no-go recommendation with strengths, risks, and
                capture actions.
              </p>
              <button
                type="button"
                onClick={() => void runAnalyze()}
                className="mt-4 rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white"
              >
                Analyze now
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm">{analysis.summary}</p>
              <SectionList title="Strengths" items={analysis.strengths} />
              <SectionList title="Risks" items={analysis.risks} />
              <SectionList title="Recommended actions" items={analysis.recommended_actions} />
              {analysis.teaming_notes && (
                <div>
                  <h3 className="text-sm font-semibold">Teaming notes</h3>
                  <p className="mt-1 text-sm text-text-muted">{analysis.teaming_notes}</p>
                </div>
              )}
              <p className="text-xs text-text-muted">Provider: {analysis.provider}</p>
            </>
          )}
        </div>
      )}

      {tab === "pursuit" && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-surface p-6">
          {!onPursuit ? (
            <p className="text-sm text-text-muted">
              Add this opportunity to your pursuit pipeline to track stage, notes, and proposal
              progress.
            </p>
          ) : (
            <>
              <label className="block text-sm">
                <span className="font-medium">Pursuit stage</span>
                <select
                  value={pursuitStage}
                  onChange={(e) => setPursuitStage(e.target.value as PursuitStage)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                >
                  {PURSUIT_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Capture notes</span>
                <textarea
                  value={pursuitNotes}
                  onChange={(e) => setPursuitNotes(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  placeholder="Teaming partners, win themes, deadlines, action items…"
                />
              </label>
              <button
                type="button"
                onClick={() => void savePursuit()}
                disabled={loading === "pursuit-save"}
                className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white"
              >
                Save pursuit
              </button>
            </>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-bg-surface p-6">
            <h2 className="font-semibold">Generate proposal sections</h2>
            <p className="text-sm text-text-muted">
              AI drafts use the DFEAL profile and opportunity context. Review and edit before
              submission.
            </p>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TYPES.map((dt) => (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => void generateDocument(dt.id)}
                  disabled={loading === `doc-${dt.id}`}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:border-gold/40 disabled:opacity-50"
                >
                  {loading === `doc-${dt.id}` ? "Generating…" : dt.label}
                </button>
              ))}
            </div>
            {docList.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm">
                {docList.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => void loadDocument(doc.id)}
                      className="text-left text-gold hover:underline"
                    >
                      {doc.title ?? doc.document_type}
                    </button>
                    <span className="ml-2 text-xs text-text-muted">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-bg-surface p-6">
            <h2 className="font-semibold">Preview</h2>
            {selectedDoc ? (
              <pre className="mt-3 max-h-[480px] overflow-auto whitespace-pre-wrap text-xs text-text-muted">
                {selectedDoc.content}
              </pre>
            ) : (
              <p className="mt-3 text-sm text-text-muted">Select or generate a document to preview.</p>
            )}
          </div>
        </div>
      )}

      {tab === "compliance" && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              Validate solicitation requirements against your draft (Section L/M style checklist).
            </p>
            <button
              type="button"
              onClick={() => void runCompliance()}
              disabled={loading === "compliance"}
              className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading === "compliance" ? "Checking…" : "Run compliance check"}
            </button>
          </div>
          {compliance && (
            <>
              <p className="text-sm">
                {compliance.summary} ({compliance.pass_count} pass · {compliance.fail_count} fail)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-text-muted">
                      <th className="py-2 pr-4">Section</th>
                      <th className="py-2 pr-4">Requirement</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compliance.items.map((item, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="py-2 pr-4 align-top">{item.section}</td>
                        <td className="py-2 pr-4 align-top">{item.requirement}</td>
                        <td className="py-2 pr-4 align-top uppercase">{item.status}</td>
                        <td className="py-2 align-top text-text-muted">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg px-3 py-2 text-sm">
      <p className="text-[10px] uppercase text-text-muted">{label}</p>
      <p className="font-semibold capitalize">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-1 list-inside list-disc text-sm text-text-muted">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatValue(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
