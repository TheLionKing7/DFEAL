"use client";

import { useEffect, useMemo, useState } from "react";
import { INDUSTRY_PRESETS, SET_ASIDE_OPTIONS, US_STATES, getIndustryPreset } from "@/lib/firms/industries";
import type { FirmFormValues } from "@/lib/firms/form-values";
import { stateName } from "@/lib/firms/states";
import { EMPLOYEE_RANGES, ENTITY_TYPES } from "@/lib/firms/validation-options";
import { cn } from "@/shared/cn";

export type SetField = <K extends keyof FirmFormValues>(key: K, value: FirmFormValues[K]) => void;

export interface SectionProps {
  v: FirmFormValues;
  set: SetField;
  setMany: (patch: Partial<FirmFormValues>) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
}

export const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold disabled:bg-bg disabled:text-text-muted";

export function Field({
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

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm lg:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ChipToggle({
  options,
  value,
  onChange,
  disabled,
  render,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  render?: (opt: string) => string;
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
            {render ? render(opt) : opt}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  locked,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        checked ? "border-gold/50 bg-gold/[0.06]" : "border-border",
        (disabled || locked) && "opacity-80",
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[#c9a84c]"
        checked={checked}
        disabled={disabled || locked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>
        <span className="font-medium">
          {label}
          {locked && <span className="ml-2 rounded bg-sidebar px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Always on</span>}
        </span>
        {description && <span className="mt-0.5 block text-xs text-text-muted">{description}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// NAICS picker
// ---------------------------------------------------------------------------

interface NaicsOption {
  code: string;
  title: string;
  sector: string;
}

export function NaicsPicker({
  codes,
  primary,
  onChange,
  disabled,
  error,
  suggestions,
}: {
  codes: string[];
  primary: string;
  onChange: (codes: string[], primary: string) => void;
  disabled?: boolean;
  error?: string;
  suggestions?: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NaicsOption[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});

  const wanted = useMemo(() => [...new Set([...codes, ...(suggestions ?? [])])], [codes, suggestions]);
  useEffect(() => {
    const missing = wanted.filter((c) => !titles[c]);
    if (!missing.length) return;
    void fetch(`/api/naics?codes=${missing.join(",")}`)
      .then((r) => r.json())
      .then((d: { results?: NaicsOption[] }) =>
        setTitles((t) => ({ ...t, ...Object.fromEntries((d.results ?? []).map((n) => [n.code, n.title])) })),
      )
      .catch(() => undefined);
  }, [wanted, titles]);

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

  function add(code: string, title?: string) {
    if (title) setTitles((t) => ({ ...t, [code]: title }));
    if (!codes.includes(code)) onChange([...codes, code], primary || code);
    setQuery("");
    setResults([]);
  }

  function remove(code: string) {
    const next = codes.filter((c) => c !== code);
    onChange(next, primary === code ? next[0] ?? "" : primary);
  }

  const unused = (suggestions ?? []).filter((c) => !codes.includes(c));

  return (
    <div className="sm:col-span-2">
      <span className="text-sm font-medium">NAICS codes *</span>
      <p className="text-xs text-text-muted">
        Search by code or keyword (NAICS 2022). Mark one as primary — it carries the most scoring weight and drives
        SAM.gov ingest.
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
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-white text-sm shadow-lg">
              {results.map((r) => (
                <li key={r.code}>
                  <button
                    type="button"
                    onClick={() => add(r.code, r.title)}
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
      {!disabled && unused.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-muted">Suggested for your industry:</span>
          {unused.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => add(c)}
              title={titles[c]}
              className="rounded-full border border-dashed border-gold/60 px-2.5 py-0.5 text-text hover:bg-gold/10"
            >
              + {c}
              {titles[c] ? ` · ${titles[c].slice(0, 32)}${titles[c].length > 32 ? "…" : ""}` : ""}
            </button>
          ))}
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
// Sections
// ---------------------------------------------------------------------------

export function IdentitySection({ v, set, errors, readOnly: ro }: SectionProps) {
  return (
    <Section title="Business information" description="Legal and SAM.gov registration details used in proposals and entity lookup.">
      <Field label="Legal business name *" error={errors.legalName}>
        <input required disabled={ro} value={v.legalName} onChange={(e) => set("legalName", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Short name" hint="Used in the UI and AI prompts. Defaults to the legal name." error={errors.shortName}>
        <input disabled={ro} value={v.shortName} onChange={(e) => set("shortName", e.target.value)} className={inputCls} />
      </Field>
      <Field label="DBA / trade name" error={errors.dbaName}>
        <input disabled={ro} value={v.dbaName} onChange={(e) => set("dbaName", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Organization type" error={errors.entityType}>
        <select disabled={ro} value={v.entityType} onChange={(e) => set("entityType", e.target.value)} className={inputCls}>
          <option value="">Select…</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Employees" error={errors.employeeRange}>
        <select disabled={ro} value={v.employeeRange} onChange={(e) => set("employeeRange", e.target.value)} className={inputCls}>
          <option value="">Select…</option>
          {EMPLOYEE_RANGES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Website" error={errors.website}>
        <input disabled={ro} type="url" placeholder="https://" value={v.website} onChange={(e) => set("website", e.target.value)} className={inputCls} />
      </Field>
      <Field label="UEI" hint="12 characters (SAM.gov Unique Entity ID)" error={errors.uei}>
        <input disabled={ro} value={v.uei} maxLength={12} onChange={(e) => set("uei", e.target.value.toUpperCase())} className={inputCls} />
      </Field>
      <Field label="CAGE code" hint="5 characters" error={errors.cage}>
        <input disabled={ro} value={v.cage} maxLength={5} onChange={(e) => set("cage", e.target.value.toUpperCase())} className={inputCls} />
      </Field>
      <Field label="Business phone" error={errors.phone}>
        <input disabled={ro} value={v.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Business contact email" error={errors.contactEmail}>
        <input disabled={ro} type="email" value={v.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Business address" error={errors.address} className="sm:col-span-2">
        <input disabled={ro} value={v.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
      </Field>
    </Section>
  );
}

export function IndustrySection({ v, set, setMany, errors, readOnly: ro }: SectionProps) {
  const preset = useMemo(() => getIndustryPreset(v.industry), [v.industry]);

  function applyIndustry(key: string) {
    const p = getIndustryPreset(key);
    if (!p) return set("industry", key);
    const naicsCodes = v.naicsCodes.length ? v.naicsCodes : p.suggestedNaics.slice(0, 3);
    setMany({
      industry: key,
      naicsCodes,
      primaryNaics: v.primaryNaics || naicsCodes[0] || "",
      keywords: v.keywords || p.keywords.join(", "),
      coreCompetencies: v.coreCompetencies || p.competencies.join("\n"),
    });
  }

  return (
    <Section title="Industry & NAICS" description="Drives SAM.gov ingest, state/local keyword filtering, and fit scoring.">
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
        suggestions={preset?.suggestedNaics}
        error={errors.primaryNaics ?? Object.entries(errors).find(([k]) => k.startsWith("naicsCodes"))?.[1]}
        onChange={(codes, primary) => setMany({ naicsCodes: codes, primaryNaics: primary })}
      />
    </Section>
  );
}

export function WorkspaceSection({ v, set, errors, readOnly: ro }: SectionProps) {
  const extra = v.targetStates.filter((s) => s !== v.homeState);
  return (
    <Section
      title="Workspace lanes"
      description="Choose which markets appear in your workspace. Federal (SAM.gov) is included for every firm."
    >
      <Toggle label="Federal (SAM.gov)" description="Federal contract opportunities, scored for your NAICS codes." checked locked />
      <Field label="Home / preferred working state *" hint="Gets its own lane and a scoring boost." error={errors.homeState}>
        <select disabled={ro} value={v.homeState} onChange={(e) => set("homeState", e.target.value)} className={inputCls}>
          <option value="">Select a state…</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {stateName(s)}
            </option>
          ))}
        </select>
      </Field>

      <div className="sm:col-span-2">
        <span className="text-sm font-medium">State opportunities</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(
            [
              ["home_only", "Home state only", "Only bids in your home state."],
              ["selected", "Home + selected states", "Your home state plus the states you pick below."],
              ["all", "All states", "Every state and local bid we ingest nationwide."],
            ] as const
          ).map(([value, label, desc]) => (
            <label
              key={value}
              className={cn(
                "cursor-pointer rounded-lg border px-4 py-3 text-sm",
                v.stateScope === value ? "border-gold bg-gold/[0.08]" : "border-border hover:border-gold/50",
              )}
            >
              <input
                type="radio"
                name="stateScope"
                className="sr-only"
                disabled={ro}
                checked={v.stateScope === value}
                onChange={() => set("stateScope", value)}
              />
              <span className="font-medium">{label}</span>
              <span className="mt-0.5 block text-xs text-text-muted">{desc}</span>
            </label>
          ))}
        </div>
        {v.stateScope === "selected" && (
          <>
            <p className="mt-3 text-xs text-text-muted">
              Other states ({extra.length} selected{extra.length ? `: ${extra.join(", ")}` : ""})
            </p>
            <ChipToggle
              disabled={ro}
              options={US_STATES.filter((s) => s !== v.homeState)}
              value={v.targetStates}
              onChange={(x) => set("targetStates", x)}
            />
          </>
        )}
      </div>

      <Toggle
        label="Local government"
        description="City, county, transit and municipal bids in your state scope."
        checked={v.laneLocal}
        disabled={ro}
        onChange={(x) => set("laneLocal", x)}
      />
      <Toggle
        label="Education"
        description="K-12 districts, universities and community colleges in your state scope."
        checked={v.laneEducation}
        disabled={ro}
        onChange={(x) => set("laneEducation", x)}
      />
      <Toggle
        label="Grants"
        description="Federal grants from Grants.gov and SBA programs."
        checked={v.laneGrants}
        disabled={ro}
        onChange={(x) => set("laneGrants", x)}
      />
    </Section>
  );
}

export function EligibilitySection({ v, set, readOnly: ro }: SectionProps) {
  return (
    <Section title="Socioeconomic status & certifications">
      <div className="sm:col-span-2">
        <span className="text-sm font-medium">Set-asides you qualify for</span>
        <ChipToggle disabled={ro} options={SET_ASIDE_OPTIONS} value={v.setAsides} onChange={(x) => set("setAsides", x)} />
      </div>
      <Field label="Other certifications & credentials" hint="One per line (e.g. ISO 9001, PMP, GSA MAS)" className="sm:col-span-2">
        <textarea disabled={ro} rows={3} value={v.certifications} onChange={(e) => set("certifications", e.target.value)} className={inputCls} />
      </Field>
    </Section>
  );
}

export function RulesSection({ v, set, errors, readOnly: ro }: SectionProps) {
  return (
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
  );
}

export function NarrativeSection({ v, set, readOnly: ro }: SectionProps) {
  return (
    <Section
      title="Capability narrative"
      description="Feeds the assistant, analyzer and proposal generator. Be specific — the AI never invents facts that are not here."
    >
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
              onClick={() => set("pastPerformance", [...v.pastPerformance, { contractName: "", agency: "", period: "", scope: "" }])}
              className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted hover:border-gold"
            >
              + Add past performance
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}

export function NotificationsSection({ v, set, errors, readOnly: ro }: SectionProps) {
  return (
    <Section title="Notifications & access">
      <Field
        label="Daily digest & briefing recipients"
        hint="Comma-separated emails. Defaults to the business contact email."
        error={Object.entries(errors).find(([k]) => k.startsWith("digestRecipients"))?.[1]}
      >
        <input disabled={ro} value={v.digestRecipients} onChange={(e) => set("digestRecipients", e.target.value)} className={inputCls} />
      </Field>
      <Toggle
        label="Include the daily briefing in the digest email"
        checked={v.briefingEmail}
        disabled={ro}
        onChange={(x) => set("briefingEmail", x)}
      />
      <Field
        label="Auto-join email domains"
        hint="Comma-separated (e.g. acme.com). Anyone signing in from these domains joins this workspace as a member."
        error={errors.allowedEmailDomains ?? Object.entries(errors).find(([k]) => k.startsWith("allowedEmailDomains"))?.[1]}
      >
        <input disabled={ro} value={v.allowedEmailDomains} onChange={(e) => set("allowedEmailDomains", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Assistant name" hint="Defaults to “<Short name>'s Assistant”">
        <input disabled={ro} value={v.assistantName} onChange={(e) => set("assistantName", e.target.value)} className={inputCls} />
      </Field>
    </Section>
  );
}

export function OwnerSection({ v, set, errors }: SectionProps) {
  return (
    <Section title="Workspace owner" description="The owner receives an invite email and full admin rights. Leave blank to own it yourself.">
      <Field label="Owner email" error={errors.ownerEmail}>
        <input type="email" value={v.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} className={inputCls} />
      </Field>
    </Section>
  );
}

export const FIRM_SECTIONS = {
  owner: OwnerSection,
  identity: IdentitySection,
  industry: IndustrySection,
  workspace: WorkspaceSection,
  eligibility: EligibilitySection,
  rules: RulesSection,
  narrative: NarrativeSection,
  notifications: NotificationsSection,
} as const;

export type FirmSectionId = keyof typeof FIRM_SECTIONS;
