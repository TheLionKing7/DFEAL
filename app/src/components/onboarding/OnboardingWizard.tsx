"use client";

import { useState } from "react";
import {
  EligibilitySection,
  Field,
  IdentitySection,
  IndustrySection,
  NarrativeSection,
  NotificationsSection,
  RulesSection,
  Section,
  WorkspaceSection,
  inputCls,
} from "@/components/firm/FirmSections";
import { SMART_CAPTURE } from "@/config/platform";
import { emptyFirmForm, formToPayload, type FirmFormValues } from "@/lib/firms/form-values";
import { industryLabel } from "@/lib/firms/industries";
import { stateName } from "@/lib/firms/states";
import { cn } from "@/shared/cn";

interface Teammate {
  email: string;
  role: "admin" | "member";
}

const STEPS = [
  { id: "you", title: "About you", blurb: "Your personal details for your user profile." },
  { id: "business", title: "Your business", blurb: "Legal and registration details used in proposals and SAM.gov lookups." },
  { id: "capabilities", title: "Capabilities & NAICS", blurb: "What you do — this drives which opportunities we ingest and how they are scored." },
  { id: "workspace", title: "Workspace setup", blurb: "Choose your markets: Federal is always on; pick your home state, state coverage, local, education and grants." },
  { id: "team", title: "Team & notifications", blurb: "Invite colleagues and choose who receives the daily digest and briefing." },
  { id: "review", title: "Review & launch", blurb: "Confirm and create your workspace." },
] as const;

export function OnboardingWizard({
  email,
  companyName,
  initialProfile,
}: {
  email: string;
  companyName?: string | null;
  initialProfile?: { fullName?: string | null; jobTitle?: string | null; phone?: string | null } | null;
}) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    fullName: initialProfile?.fullName ?? "",
    jobTitle: initialProfile?.jobTitle ?? "",
    phone: initialProfile?.phone ?? "",
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "",
  });
  const [v, setV] = useState<FirmFormValues>(() => ({
    ...emptyFirmForm(),
    legalName: companyName ?? "",
    contactEmail: email,
    digestRecipients: email,
  }));
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [mate, setMate] = useState<Teammate>({ email: "", role: "member" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FirmFormValues>(key: K, value: FirmFormValues[K]) => setV((p) => ({ ...p, [key]: value }));
  const setMany = (patch: Partial<FirmFormValues>) => setV((p) => ({ ...p, ...patch }));
  const sectionProps = { v, set, setMany, errors };

  function validate(i: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (i === 0 && profile.fullName.trim().length < 2) e["profile.fullName"] = "Enter your full name";
    if (i === 1 && v.legalName.trim().length < 2) e.legalName = "Enter your legal business name";
    if (i === 2) {
      if (!v.industry) e.industry = "Choose an industry";
      if (!v.primaryNaics) e.primaryNaics = "Add at least one NAICS code and mark a primary";
    }
    if (i === 3) {
      if (!v.homeState) e.homeState = "Choose your home or preferred working state";
      if (v.stateScope === "selected" && v.targetStates.filter((s) => s !== v.homeState).length === 0) {
        // allowed, but nudge
      }
    }
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    for (let i = 0; i < STEPS.length - 1; i += 1) {
      const e = validate(i);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(i);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, firm: formToPayload(v), teammates }),
      });
      const data = (await res.json()) as { error?: string; details?: Record<string, string>; scored?: number };
      if (!res.ok) {
        setErrors(data.details ?? {});
        setError(
          data.details
            ? `${data.error}: ${Object.entries(data.details)
                .slice(0, 4)
                .map(([k, m]) => `${k} — ${m}`)
                .join("; ")}`
            : data.error ?? "Could not create workspace",
        );
        return;
      }
      setDone(`Workspace ready — ${data.scored ?? 0} opportunities scored for ${v.legalName}. Next: add your reference documents…`);
      setTimeout(() => window.location.assign("/settings?tab=documents&welcome=1"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create workspace");
    } finally {
      setSubmitting(false);
    }
  }

  const current = STEPS[step];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-gold">{SMART_CAPTURE.name}</p>
        <h1 className="mt-1 text-2xl font-bold">Set up your capture workspace</h1>
        <p className="mt-1 text-sm text-text-muted">Signed in as {email}</p>
      </header>

      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              className={cn(
                "w-full rounded-lg border px-2 py-2 text-left text-xs",
                i === step ? "border-gold bg-gold/10 font-semibold" : i < step ? "border-success/40 text-success" : "border-border text-text-muted",
              )}
            >
              <span className="block text-[10px] uppercase tracking-wide">Step {i + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div>
        <h2 className="text-lg font-semibold">{current.title}</h2>
        <p className="text-sm text-text-muted">{current.blurb}</p>
      </div>

      {current.id === "you" && (
        <Section title="Personal information">
          <Field label="Full name *" error={errors["profile.fullName"]}>
            <input className={inputCls} value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
          </Field>
          <Field label="Job title">
            <input className={inputCls} value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} />
          </Field>
          <Field label="Work email">
            <input className={inputCls} value={email} disabled />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </Field>
        </Section>
      )}

      {current.id === "business" && <IdentitySection {...sectionProps} />}

      {current.id === "capabilities" && (
        <>
          <IndustrySection {...sectionProps} />
          <EligibilitySection {...sectionProps} />
          <NarrativeSection {...sectionProps} />
        </>
      )}

      {current.id === "workspace" && (
        <>
          <WorkspaceSection {...sectionProps} />
          <RulesSection {...sectionProps} />
        </>
      )}

      {current.id === "team" && (
        <>
          <Section title="Invite your team" description="They'll get an email to join this workspace. You can add more later in Settings → Team.">
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
              <label className="min-w-[14rem] flex-1 text-sm">
                <span className="font-medium">Email</span>
                <input
                  type="email"
                  className={inputCls}
                  value={mate.email}
                  placeholder="colleague@yourfirm.com"
                  onChange={(e) => setMate({ ...mate, email: e.target.value })}
                />
              </label>
              <select
                className="rounded-lg border border-border px-3 py-2 text-sm"
                value={mate.role}
                onChange={(e) => setMate({ ...mate, role: e.target.value as Teammate["role"] })}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const em = mate.email.trim().toLowerCase();
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || teammates.some((t) => t.email === em)) return;
                  setTeammates([...teammates, { email: em, role: mate.role }]);
                  setMate({ email: "", role: "member" });
                }}
                className="rounded-lg bg-sidebar px-4 py-2 text-sm text-white"
              >
                Add
              </button>
            </div>
            <ul className="space-y-1 sm:col-span-2">
              {teammates.map((t) => (
                <li key={t.email} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{t.email}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs capitalize text-text-muted">{t.role}</span>
                    <button
                      type="button"
                      className="text-xs text-text-muted hover:text-error"
                      onClick={() => setTeammates(teammates.filter((x) => x.email !== t.email))}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
              {teammates.length === 0 && <li className="text-xs text-text-muted">No teammates added (optional).</li>}
            </ul>
          </Section>
          <NotificationsSection {...sectionProps} />
        </>
      )}

      {current.id === "review" && (
        <Section title="Summary">
          <Summary label="You" value={`${profile.fullName}${profile.jobTitle ? `, ${profile.jobTitle}` : ""} · ${email}`} />
          <Summary label="Business" value={`${v.legalName}${v.uei ? ` · UEI ${v.uei}` : ""}${v.cage ? ` · CAGE ${v.cage}` : ""}`} />
          <Summary label="Industry" value={v.industry ? industryLabel(v.industry) : "—"} />
          <Summary label="NAICS" value={v.naicsCodes.map((c) => (c === v.primaryNaics ? `${c} (primary)` : c)).join(", ") || "—"} />
          <Summary label="Home state" value={stateName(v.homeState) || "—"} />
          <Summary
            label="Lanes"
            value={[
              "Federal",
              v.homeState && `${v.homeState} (home)`,
              v.stateScope === "all" ? "State — all states" : v.stateScope === "selected" ? `State — ${[v.homeState, ...v.targetStates.filter((s) => s !== v.homeState)].filter(Boolean).join(", ")}` : null,
              v.laneLocal && "Local",
              v.laneEducation && "Education",
              v.laneGrants && "Grants",
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Summary label="Set-asides" value={v.setAsides.join(", ") || "None selected"} />
          <Summary label="Team invites" value={teammates.map((t) => t.email).join(", ") || "None"} />
        </Section>
      )}

      {error && <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>}
      {done && <p className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{done}</p>}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          disabled={step === 0 || submitting}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
        >
          Back
        </button>
        {current.id === "review" ? (
          <button
            type="button"
            disabled={submitting || Boolean(done)}
            onClick={() => void submit()}
            className="rounded-lg bg-sidebar px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Creating workspace & scoring opportunities…" : "Create my workspace"}
          </button>
        ) : (
          <button type="button" onClick={next} className="rounded-lg bg-sidebar px-6 py-2.5 text-sm font-medium text-white">
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
