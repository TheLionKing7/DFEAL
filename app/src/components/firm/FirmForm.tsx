"use client";

import { useEffect, useMemo, useState } from "react";
import { INDUSTRY_PRESETS, SET_ASIDE_OPTIONS, US_STATES, getIndustryPreset } from "@/lib/firms/industries";
import type { FirmProfile, PastPerformanceRecord } from "@/lib/firms/types";
import { cn } from "@/shared/cn";

interface NaicsOption {
  code: string;
  title: string;
  sector: string;
}

export interface FirmFormValues {
  legalName: string;
  shortName: string;
  uei: string;
  cage: string;
  duns: string;
  industry: string;
  primaryNaics: string;
  naicsCodes: string[];
  keywords: string;
  setAsides: string[];
  certifications: string;
  homeState: string;
  targetStates: string[];
  capabilityStatement: string;
  coreCompetencies: string;
  differentiators: string;
  pastPerformance: PastPerformanceRecord[];
  minContractValueUsd: string;
  minDaysToDeadline: string;
  preferredSetAsides: string[];
  priorityAgencies: string;
  excludedAgencies: string;
  contactEmail: string;
  phone: string;
  website: string;
  address: string;
  assistantName: string;
  allowedEmailDomains: string;
  digestRecipients: string;
  ownerEmail: string;
}

export function emptyFirmForm(): FirmFormValues {
  return {
    legalName: "",
    shortName: "",
    uei: "",
    cage: "",
    duns: "",
    industry: "",
    primaryNaics: "",
    naicsCodes: [],
    keywords: "",
    setAsides: [],
    certifications: "",
    homeState: "",
    targetStates: [],
    capabilityStatement: "",
    coreCompetencies: "",
    differentiators: "",
    pastPerformance: [],
    minContractValueUsd: "",
    minDaysToDeadline: "5",
    preferredSetAsides: ["None", "Unrestricted"],
    priorityAgencies: "",
    excludedAgencies: "",
    contactEmail: "",
    phone: "",
    website: "",
    address: "",
    assistantName: "",
    allowedEmailDomains: "",
    digestRecipients: "",
    ownerEmail: "",
  };
}

export function firmToForm(f: FirmProfile): FirmFormValues {
  return {
    ...emptyFirmForm(),
    legalName: f.legalName,
    shortName: f.shortName,
    uei: f.uei ?? "",
    cage: f.cage ?? "",
    duns: f.duns ?? "",
    industry: f.industry,
    primaryNaics: f.primaryNaics,
    naicsCodes: f.naicsCodes,
    keywords: f.keywords.join(", "),
    setAsides: f.setAsides,
    certifications: f.certifications.join("\n"),
    homeState: f.homeState ?? "",
    targetStates: f.targetStates,
    capabilityStatement: f.capabilityStatement,
    coreCompetencies: f.coreCompetencies.join("\n"),
    differentiators: f.differentiators.join("\n"),
    pastPerformance: f.pastPerformance,
    minContractValueUsd: f.goNoGo.minContractValueUsd != null ? String(f.goNoGo.minContractValueUsd) : "",
    minDaysToDeadline: String(f.goNoGo.minDaysToDeadline),
    preferredSetAsides: f.goNoGo.preferredSetAsides,
    priorityAgencies: f.goNoGo.priorityAgencies.join("\n"),
    excludedAgencies: f.goNoGo.excludedAgencies.join("\n"),
    contactEmail: f.contactEmail ?? "",
    phone: f.phone ?? "",
    website: f.website ?? "",
    address: f.address ?? "",
    assistantName: f.assistantName,
    allowedEmailDomains: f.allowedEmailDomains.join(", "),
    digestRecipients: f.digestRecipients.join(", "),
  };
}

const splitComma = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
const splitLines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
const orNull = (v: string) => (v.trim() ? v.trim() : null);

/** Convert form state into the API payload validated by firmInputSchema. */
export function formToPayload(v: FirmFormValues) {
  return {
    legalName: v.legalName,
    shortName: v.shortName.trim() || undefined,
    uei: orNull(v.uei),
    cage: orNull(v.cage),
    duns: orNull(v.duns),
    industry: v.industry,
    primaryNaics: v.primaryNaics,
    naicsCodes: v.naicsCodes,
    keywords: splitComma(v.keywords),
    setAsides: v.setAsides,
    certifications: splitLines(v.certifications),
    homeState: orNull(v.homeState),
    targetStates: v.targetStates,
    capabilityStatement: v.capabilityStatement,
    coreCompetencies: splitLines(v.coreCompetencies),
    differentiators: splitLines(v.differentiators),
    pastPerformance: v.pastPerformance.filter((p) => p.contractName.trim() && p.agency.trim()),
    goNoGo: {
      minContractValueUsd: v.minContractValueUsd ? Number(v.minContractValueUsd) : undefined,
      minDaysToDeadline: Number(v.minDaysToDeadline || 5),
      preferredSetAsides: v.preferredSetAsides,
      priorityAgencies: splitLines(v.priorityAgencies),
      excludedAgencies: splitLines(v.excludedAgencies),
    },
    contactEmail: orNull(v.contactEmail),
    phone: orNull(v.phone),
    website: orNull(v.website),
    address: orNull(v.address),
    assistantName: orNull(v.assistantName),
    allowedEmailDomains: splitComma(v.allowedEmailDomains).map((d) => d.replace(/^@/, "").toLowerCase()),
    digestRecipients: splitComma(v.digestRecipients),
    ownerEmail: v.ownerEmail.trim() || undefined,
  };
}

// ---------------------------------------------------------------------------
// UI primitives
// ---------------------------------------------------------------------------

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold disabled:bg-bg disabled:text-text-muted";

function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-error">{error}</span>}
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm lg:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ChipToggle({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((x) => x !== opt) : [...value, opt])}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              on ? "border-gold bg-gold/15 text-text" : "border-border text-text-muted hover:border-gold/60",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NAICS picker
// ---------------------------------------------------------------------------

function NaicsPicker({
  codes,
  primary,
  onChange,
  disabled,
  error,
}: {
  codes: string[];
  primary: string;
  onChange: (codes: string[], primary: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NaicsOption[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const missing = codes.filter((c) => !titles[c]);
    if (!missing.length) return;
    void fetch(`/api/naics?codes=${missing.join(",")}`)
      .then((r) => r.json())
      .then((d: { results?: NaicsOption[] }) =>
        setTitles((t) => ({ ...t, ...Object.fromEntries((d.results ?? []).map((n) => [n.code, n.title])) })),
      )
      .catch(() => undefined);
  }, [codes, titles]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      void fetch(`/api/naics?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { results?: NaicsOption[] }) => setResults(d.results ?? []))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function add(opt: NaicsOption) {
    setTitles((t) => ({ ...t, [opt.code]: opt.title }));
    if (!codes.includes(opt.code)) onChange([...codes, opt.code], primary || opt.code);
    setQuery("");
    setResults([]);
  }

  function remove(code: string) {
    const next = codes.filter((c) => c !== code);
    onChange(next, primary === code ? next[0] ?? "" : primary);
  }

  return (
    <div className="sm:col-span-2">
      <span className="text-sm font-medium">NAICS codes</span>
      <p className="text-xs text-text-muted">
        Search by code or keyword (NAICS 2022). Choose one primary code — it drives the strongest scoring weight and SAM.gov ingest.
      </p>
      {!disabled && (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 541512 or computer systems design"
            className={inputCls}
          />
          {query.trim().length >= 2 && results.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-white text-sm shadow-lg">
              {results.map((r) => (
                <li key={r.code}>
                  <button
                    type="button"
                    onClick={() => add(r)}
                    className="flex w-full gap-3 px-3 py-2 text-left hover:bg-bg"
                  >
                    <span className="font-mono text-gold">{r.code}</span>
                    <span>{r.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ul className="mt-3 space-y-1.5">
        {codes.map((code) => (
          <li key={code} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="radio"
                name="primaryNaics"
                checked={primary === code}
                disabled={disabled}
                onChange={() => onChange(codes, code)}
              />
              Primary
            </label>
            <span className="font-mono">{code}</span>
            <span className="min-w-0 flex-1 truncate">{titles[code] ?? ""}</span>
            {!disabled && (
              <button type="button" onClick={() => remove(code)} className="text-xs text-text-muted hover:text-error">
                Remove
              </button>
            )}
          </li>
        ))}
        {codes.length === 0 && <li className="text-xs text-text-muted">No NAICS codes selected yet.</li>}
      </ul>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

export function FirmForm({
  mode,
  initial,
  readOnly,
  showOwnerEmail,
  onSaved,
}: {
  mode: "create" | "edit";
  initial: FirmFormValues;
  readOnly?: boolean;
  showOwnerEmail?: boolean;
  onSaved?: (result: { firm: FirmProfile; scored?: number }) => void;
}) {
  const [v, setV] = useState<FirmFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FirmFormValues>(key: K, value: FirmFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const preset = useMemo(() => getIndustryPreset(v.industry), [v.industry]);

  function applyIndustry(key: string) {
    const p = getIndustryPreset(key);
    setV((prev) => {
      if (!p) return { ...prev, industry: key };
      const naicsCodes = prev.naicsCodes.length ? prev.naicsCodes : p.suggestedNaics;
      return {
        ...prev,
        industry: key,
        naicsCodes,
        primaryNaics: prev.primaryNaics || naicsCodes[0] || "",
        keywords: prev.keywords || p.keywords.join(", "),
        coreCompetencies: prev.coreCompetencies || p.competencies.join("\n"),
      };
    });
  }

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
      setStatus({
        kind: "ok",
        text:
          mode === "create"
            ? `${data.firm.legalName} onboarded — ${data.scored ?? 0} opportunities scored.`
            : `Profile saved — ${data.scored ?? 0} opportunities re-scored.`,
      });
      onSaved?.({ firm: data.firm, scored: data.scored });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  const ro = readOnly;

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Company identity" description="Legal and SAM.gov registration details used in proposals and entity lookup.">
        <Field label="Legal name *" error={errors.legalName}>
          <input required disabled={ro} value={v.legalName} onChange={(e) => set("legalName", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Short name" hint="Used in the UI and AI prompts. Defaults to the legal name." error={errors.shortName}>
          <input disabled={ro} value={v.shortName} onChange={(e) => set("shortName", e.target.value)} className={inputCls} />
        </Field>
        <Field label="UEI" hint="12 characters (SAM.gov Unique Entity ID)" error={errors.uei}>
          <input disabled={ro} value={v.uei} maxLength={12} onChange={(e) => set("uei", e.target.value.toUpperCase())} className={inputCls} />
        </Field>
        <Field label="CAGE code" hint="5 characters" error={errors.cage}>
          <input disabled={ro} value={v.cage} maxLength={5} onChange={(e) => set("cage", e.target.value.toUpperCase())} className={inputCls} />
        </Field>
        <Field label="Website" error={errors.website}>
          <input disabled={ro} type="url" placeholder="https://" value={v.website} onChange={(e) => set("website", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input disabled={ro} value={v.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Contact email" error={errors.contactEmail}>
          <input disabled={ro} type="email" value={v.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Address" error={errors.address}>
          <input disabled={ro} value={v.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Industry & NAICS" description="Drives SAM.gov ingest, SLED keyword filtering, and fit scoring.">
        <Field label="Industry *" error={errors.industry} hint={preset?.description}>
          <select required disabled={ro} value={v.industry} onChange={(e) => applyIndustry(e.target.value)} className={inputCls}>
            <option value="">Select an industry…</option>
            {INDUSTRY_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Capability keywords" hint="Comma-separated. Used to filter state/local bids and score relevance." error={errors.keywords}>
          <input disabled={ro} value={v.keywords} onChange={(e) => set("keywords", e.target.value)} className={inputCls} />
        </Field>
        <NaicsPicker
          codes={v.naicsCodes}
          primary={v.primaryNaics}
          disabled={ro}
          error={errors.primaryNaics ?? Object.entries(errors).find(([k]) => k.startsWith("naicsCodes"))?.[1]}
          onChange={(codes, primary) => setV((prev) => ({ ...prev, naicsCodes: codes, primaryNaics: primary }))}
        />
      </Section>

      <Section title="Socioeconomic status & geography">
        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Eligible set-asides / certifications held</span>
          <ChipToggle disabled={ro} options={SET_ASIDE_OPTIONS} value={v.setAsides} onChange={(x) => set("setAsides", x)} />
        </div>
        <Field label="Home state" hint="Home-state bids get a scoring boost." error={errors.homeState}>
          <select disabled={ro} value={v.homeState} onChange={(e) => set("homeState", e.target.value)} className={inputCls}>
            <option value="">—</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <span className="text-sm font-medium">Target states</span>
          <ChipToggle disabled={ro} options={US_STATES} value={v.targetStates} onChange={(x) => set("targetStates", x)} />
        </div>
        <Field label="Other certifications & credentials" hint="One per line (e.g. ISO 9001, PMP, GSA MAS)" className="sm:col-span-2">
          <textarea disabled={ro} rows={3} value={v.certifications} onChange={(e) => set("certifications", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Go / no-go rules" description="How opportunities are scored and filtered for this firm.">
        <Field label="Minimum contract value (USD)" error={errors["goNoGo.minContractValueUsd"]}>
          <input disabled={ro} type="number" min={0} value={v.minContractValueUsd} onChange={(e) => set("minContractValueUsd", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Minimum days to deadline" error={errors["goNoGo.minDaysToDeadline"]}>
          <input disabled={ro} type="number" min={0} max={120} value={v.minDaysToDeadline} onChange={(e) => set("minDaysToDeadline", e.target.value)} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Preferred set-asides</span>
          <ChipToggle disabled={ro} options={SET_ASIDE_OPTIONS} value={v.preferredSetAsides} onChange={(x) => set("preferredSetAsides", x)} />
        </div>
        <Field label="Priority agencies" hint="One per line — boosts score">
          <textarea disabled={ro} rows={3} value={v.priorityAgencies} onChange={(e) => set("priorityAgencies", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Excluded agencies" hint="One per line — heavily penalized">
          <textarea disabled={ro} rows={3} value={v.excludedAgencies} onChange={(e) => set("excludedAgencies", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Capability narrative" description="Feeds the AI assistant, analyzer, and proposal generator. Be specific — it never invents facts that are not here.">
        <Field label="Capability statement" className="sm:col-span-2">
          <textarea disabled={ro} rows={6} value={v.capabilityStatement} onChange={(e) => set("capabilityStatement", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Core competencies" hint="One per line">
          <textarea disabled={ro} rows={5} value={v.coreCompetencies} onChange={(e) => set("coreCompetencies", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Differentiators" hint="One per line">
          <textarea disabled={ro} rows={5} value={v.differentiators} onChange={(e) => set("differentiators", e.target.value)} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Past performance</span>
          <div className="mt-2 space-y-2">
            {v.pastPerformance.map((pp, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_8rem_auto]">
                {(["contractName", "agency", "period"] as const).map((k) => (
                  <input
                    key={k}
                    disabled={ro}
                    placeholder={k === "contractName" ? "Contract / project" : k === "agency" ? "Agency / client" : "Period"}
                    value={pp[k] ?? ""}
                    onChange={(e) =>
                      set(
                        "pastPerformance",
                        v.pastPerformance.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)),
                      )
                    }
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                ))}
                {!ro && (
                  <button
                    type="button"
                    onClick={() => set("pastPerformance", v.pastPerformance.filter((_, j) => j !== i))}
                    className="text-xs text-text-muted hover:text-error"
                  >
                    Remove
                  </button>
                )}
                <textarea
                  disabled={ro}
                  rows={2}
                  placeholder="Scope"
                  value={pp.scope}
                  onChange={(e) =>
                    set(
                      "pastPerformance",
                      v.pastPerformance.map((x, j) => (j === i ? { ...x, scope: e.target.value } : x)),
                    )
                  }
                  className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-4"
                />
              </div>
            ))}
            {!ro && (
              <button
                type="button"
                onClick={() =>
                  set("pastPerformance", [...v.pastPerformance, { contractName: "", agency: "", period: "", scope: "" }])
                }
                className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted hover:border-gold"
              >
                + Add past performance
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Access & notifications">
        <Field
          label="Auto-join email domains"
          hint="Comma-separated (e.g. acme.com). Anyone signing in from these domains joins this firm as a member."
          error={errors.allowedEmailDomains ?? Object.entries(errors).find(([k]) => k.startsWith("allowedEmailDomains"))?.[1]}
        >
          <input disabled={ro} value={v.allowedEmailDomains} onChange={(e) => set("allowedEmailDomains", e.target.value)} className={inputCls} />
        </Field>
        <Field
          label="Daily digest recipients"
          hint="Comma-separated emails. Defaults to the contact email."
          error={Object.entries(errors).find(([k]) => k.startsWith("digestRecipients"))?.[1]}
        >
          <input disabled={ro} value={v.digestRecipients} onChange={(e) => set("digestRecipients", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Assistant name" hint="Defaults to “<Short name>'s Assistant”">
          <input disabled={ro} value={v.assistantName} onChange={(e) => set("assistantName", e.target.value)} className={inputCls} />
        </Field>
        {showOwnerEmail && (
          <Field label="Owner email" hint="Receives an invite and owner rights. Defaults to you." error={errors.ownerEmail}>
            <input type="email" value={v.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} className={inputCls} />
          </Field>
        )}
      </Section>

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

      {!ro && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sidebar px-6 py-2.5 text-sm font-medium text-white hover:bg-sidebar-surface disabled:opacity-60"
          >
            {saving ? "Saving & scoring…" : mode === "create" ? "Onboard firm" : "Save profile"}
          </button>
        </div>
      )}
    </form>
  );
}
