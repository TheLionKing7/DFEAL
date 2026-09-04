"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell, Panel } from "@/components/layout/PageShell";
import { DocumentGeneratorPanel } from "@/components/opportunity/DocumentGeneratorPanel";
import { OpportunityContractStrip } from "@/components/opportunity/OpportunityContractStrip";
import { WorkspaceTabs, type WorkspaceTab } from "@/components/opportunity/WorkspaceTabs";
import { enrichOpportunityDetails } from "@/lib/opportunity/enrich";
import { classifyOpportunity } from "@/lib/opportunity/classify";
import { markdownToPlainText } from "@/lib/export/markdown";
import { PURSUIT_STAGES, type PursuitStage } from "@/shared/opportunity-lanes";
import { type DocumentType } from "@/shared/document-types";
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

interface OverviewSummary {
  executive_summary: string;
  scope_of_work: string;
  key_requirements: string[];
  important_dates: string[];
  dfeal_fit: string;
  recommended_next_steps: string[];
  provider: string;
  cached?: boolean;
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

const btnPrimary =
  "rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white hover:bg-sidebar-surface disabled:opacity-60";
const btnSecondary =
  "rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium hover:border-gold/40 disabled:opacity-60";

export function OpportunityWorkspace({
  opportunity,
  score,
  pursuit,
  analyses,
  overviewSummary: initialOverview,
  documents,
  complianceRuns,
}: {
  opportunity: Opportunity;
  score: ScoreData | null;
  pursuit: PursuitData | null;
  analyses: AnalysisData[];
  overviewSummary: OverviewSummary | null;
  documents: DocumentData[];
  complianceRuns: ComplianceData[];
}) {
  const details = enrichOpportunityDetails(opportunity);
  const classification = classifyOpportunity(opportunity);
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [onPursuit, setOnPursuit] = useState(Boolean(pursuit));
  const [pursuitStage, setPursuitStage] = useState<PursuitStage>(
    pursuit?.pursuit_stage ?? "tracking",
  );
  const [pursuitNotes, setPursuitNotes] = useState(pursuit?.notes ?? "");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(analyses[0] ?? null);
  const [overview, setOverview] = useState<OverviewSummary | null>(initialOverview);
  const [docList, setDocList] = useState(documents);
  const [selectedDoc, setSelectedDoc] = useState<{
    id: string;
    content: string;
    title: string;
  } | null>(null);
  const [compliance, setCompliance] = useState<ComplianceData | null>(
    complianceRuns[0] ?? null,
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [primaryDocType, setPrimaryDocType] = useState<DocumentType>("contract_proposal");

  useEffect(() => {
    void fetch(`/api/documents/recommend?opportunity_id=${opportunity.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.primary?.document_type) {
          setPrimaryDocType(data.primary.document_type as DocumentType);
        }
      })
      .catch(() => undefined);
  }, [opportunity.id, opportunity.notice_type]);

  const loadOverview = useCallback(async (force = false) => {
    if (!force && overview) return;
    setLoading("overview");
    setError(null);
    try {
      if (!force) {
        const cached = await fetch(`/api/opportunities/${opportunity.id}/summarize`);
        const cachedData = await cached.json();
        if (cachedData.summary) {
          setOverview(cachedData.summary);
          return;
        }
      }
      const res = await fetch(`/api/opportunities/${opportunity.id}/summarize`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Summary failed");
      setOverview(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summary failed");
    } finally {
      setLoading(null);
    }
  }, [opportunity.id, overview]);

  useEffect(() => {
    if (tab === "overview" && !overview && !initialOverview) {
      void loadOverview();
    }
  }, [tab, overview, initialOverview, loadOverview]);

  async function runAnalyze() {
    setLoading("analyze");
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}/analyze`, {
        method: "POST",
      });
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
    setTab("documents");
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: opportunity.id,
          document_type: documentType,
          analysis_summary: analysis?.summary ?? overview?.executive_summary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            "Document generation failed. Confirm ANTHROPIC_API_KEY or GROQ_API_KEY is set on the server.",
        );
      }
      const content = data.document?.content_text ?? "";
      setDocList((prev) => [data.document, ...prev]);
      setSelectedDoc({
        id: data.document.id,
        title: data.document.title ?? documentType,
        content,
      });
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
        content: data.document.content_text ?? "",
      });
      setTab("documents");
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
    <PageShell className="space-y-5">
      <Breadcrumb>
        <Link href="/explore" className="hover:text-gold">
          Explore
        </Link>
        <span className="mx-2">/</span>
        <Link href="/opportunities" className="hover:text-gold">
          Opportunities
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text">Workspace</span>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-snug lg:text-2xl">{opportunity.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runAnalyze()}
            disabled={loading === "analyze"}
            className={btnPrimary}
          >
            {loading === "analyze" ? "Analyzing…" : "AI go/no-go"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("documents");
              void generateDocument(primaryDocType);
            }}
            disabled={loading?.startsWith("doc-")}
            className={btnSecondary}
          >
            {loading?.startsWith("doc-") ? "Generating…" : "Generate document"}
          </button>
          <button type="button" onClick={() => void togglePursuit()} className={btnSecondary}>
            {onPursuit ? "In pursuits" : "Start pursuit"}
          </button>
        </div>
      </div>

      <OpportunityContractStrip opportunity={opportunity} />

      {!classification.isPursuable && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>{classification.label}</strong> — {classification.reason}. This item is
          listed for awareness and is not scored as a contract opportunity.
        </div>
      )}

      {(score || analysis) && classification.isPursuable && (
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
        <div className="space-y-4">
          <Panel title="AI summary">
            {loading === "overview" && !overview && (
              <p className="text-sm text-text-muted">Generating opportunity overview…</p>
            )}
            {overview ? (
              <div className="space-y-4 text-sm">
                <p className="text-base leading-relaxed">{overview.executive_summary}</p>
                <div>
                  <h3 className="font-semibold">Scope of work</h3>
                  <p className="mt-1 whitespace-pre-wrap text-text-muted">{overview.scope_of_work}</p>
                </div>
                <div>
                  <h3 className="font-semibold">DFEAL fit</h3>
                  <p className="mt-1 text-text-muted">{overview.dfeal_fit}</p>
                </div>
                <BulletSection title="Key requirements" items={overview.key_requirements} />
                <BulletSection title="Important dates" items={overview.important_dates} />
                <BulletSection title="Recommended next steps" items={overview.recommended_next_steps} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void loadOverview(true)}
                    className={btnSecondary}
                  >
                    Refresh summary
                  </button>
                  <button type="button" onClick={() => void runAnalyze()} className={btnPrimary}>
                    Run full analysis
                  </button>
                </div>
              </div>
            ) : (
              !loading && (
                <button type="button" onClick={() => void loadOverview(true)} className={btnPrimary}>
                  Generate AI overview
                </button>
              )
            )}
          </Panel>

          <Panel title="Solicitation details">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Notice #" value={opportunity.external_id} />
              <Field label="Set-aside" value={opportunity.set_aside ?? "Unrestricted"} />
              <Field label="PSC" value={opportunity.psc ?? "—"} />
              <Field label="Est. value" value={formatValue(opportunity.estimated_value_usd)} />
            </dl>
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Full description</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                {details.description ??
                  details.synopsis ??
                  "No description in the feed. Open the source portal for the full solicitation text."}
              </p>
            </div>
            {details.contacts.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Contacts</h3>
                <ul className="mt-2 space-y-1 text-sm text-text-muted">
                  {details.contacts.map((c, i) => (
                    <li key={i}>
                      {c.name}
                      {c.email ? ` · ${c.email}` : ""}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {details.resourceLinks.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Links & attachments</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {details.resourceLinks.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-gold hover:underline"
                      >
                        {link.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {score && (
              <div className="mt-4 rounded-lg bg-bg p-4 text-sm">
                <p className="font-medium">Daily profile score</p>
                <p className="mt-1 text-text-muted">{score.rationale}</p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "analyze" && (
        <Panel title="Go / no-go analysis">
          {!analysis ? (
            <div className="text-center">
              <p className="text-sm text-text-muted">
                Deep AI analysis with strengths, risks, and capture actions.
              </p>
              <button type="button" onClick={() => void runAnalyze()} className={cn(btnPrimary, "mt-4")}>
                Analyze now
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <p>{analysis.summary}</p>
              <BulletSection title="Strengths" items={analysis.strengths} />
              <BulletSection title="Risks" items={analysis.risks} />
              <BulletSection title="Recommended actions" items={analysis.recommended_actions} />
              {analysis.teaming_notes && (
                <div>
                  <h3 className="font-semibold">Teaming notes</h3>
                  <p className="mt-1 text-text-muted">{analysis.teaming_notes}</p>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {tab === "pursuit" && (
        <Panel title="Pursuit pipeline">
          {!onPursuit ? (
            <p className="text-sm text-text-muted">
              Add to your pursuit pipeline to track stage, notes, and proposal progress.
            </p>
          ) : (
            <div className="space-y-4">
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
                />
              </label>
              <button type="button" onClick={() => void savePursuit()} className={btnPrimary}>
                Save pursuit
              </button>
            </div>
          )}
        </Panel>
      )}

      {tab === "documents" && (
        <DocumentGeneratorPanel
          opportunityId={opportunity.id}
          noticeType={opportunity.notice_type}
          docList={docList}
          selectedDoc={selectedDoc}
          loading={loading}
          onGenerate={(type) => void generateDocument(type)}
          onLoadDocument={(id) => void loadDocument(id)}
          onCopy={() => {
            if (selectedDoc?.content)
              void navigator.clipboard.writeText(markdownToPlainText(selectedDoc.content));
          }}
        />
      )}

      {tab === "compliance" && (
        <Panel title="Compliance check">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              Section L/M style checklist against solicitation and your draft.
            </p>
            <button
              type="button"
              onClick={() => void runCompliance()}
              disabled={loading === "compliance"}
              className={btnPrimary}
            >
              {loading === "compliance" ? "Checking…" : "Run compliance check"}
            </button>
          </div>
          {compliance && (
            <>
              <p className="text-sm">
                {compliance.summary} ({compliance.pass_count} pass · {compliance.fail_count} fail)
              </p>
              <div className="mt-4 overflow-x-auto">
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
        </Panel>
      )}
    </PageShell>
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

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-1 list-inside list-disc text-text-muted">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatValue(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
