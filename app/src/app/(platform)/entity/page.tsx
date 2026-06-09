"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";
import {
  formatRegistrationLabel,
  formatSamEntityDate,
} from "@/lib/sam-gov/format-entity";
import type { SamEntity } from "@/shared/types/entity";
import { cn } from "@/shared/cn";

type LookupMode = "id" | "name";

interface LookupResponse {
  entity?: SamEntity;
  entities?: SamEntity[];
  suggestions?: SamEntity[];
  source?: string;
  notice?: string;
  error?: string;
}

function EntityCard({
  entity,
  notice,
  source,
}: {
  entity: SamEntity;
  notice?: string;
  source?: string;
}) {
  return (
    <Panel className="space-y-4">
      {notice && (
        <p className="rounded-lg border border-gold/30 bg-gold/[0.06] px-4 py-3 text-sm text-text">
          {notice}
        </p>
      )}
      {source === "profile_fallback" && (
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">
          On-file profile — not verified by SAM.gov
        </p>
      )}

      <div>
        <h2 className="text-xl font-bold text-text">{entity.legal_name}</h2>
        {entity.dba_name && (
          <p className="mt-1 text-sm text-text-muted">DBA: {entity.dba_name}</p>
        )}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <Field label="UEI" value={entity.uei} mono />
        <Field label="CAGE" value={entity.cage ?? "—"} mono />
        <Field
          label="Registration"
          value={formatRegistrationLabel(entity.registration_status, source)}
          badge={source === "profile_fallback" ? "unknown" : entity.registration_status}
        />
        <Field
          label="Expiration"
          value={
            source === "profile_fallback"
              ? "Not verified — check SAM.gov"
              : formatSamEntityDate(entity.expiration_date)
          }
        />
        {entity.physical_address && (
          <Field
            label="Location"
            value={[entity.physical_address.city, entity.physical_address.state, entity.physical_address.zip]
              .filter(Boolean)
              .join(", ") || "—"}
          />
        )}
      </dl>

      {entity.naics_codes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">NAICS</p>
          <p className="mt-1 font-mono text-sm text-text">
            {entity.naics_codes.join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {entity.naics_codes.map((code) => (
              <span
                key={code}
                className="rounded bg-gold/15 px-2 py-0.5 font-mono text-xs font-medium text-gold"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-text-muted">
        Fetched {new Date(entity.fetched_at).toLocaleString()}
        {source === "sam" && (
          <>
            {" "}
            ·{" "}
            <a
              href={`https://sam.gov/entity/${entity.uei}/coreData`}
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:underline"
            >
              View on SAM.gov ↗
            </a>
          </>
        )}
      </p>
    </Panel>
  );
}

function Field({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-sm font-medium text-text",
          mono && "font-mono",
          badge === "active" && "text-success",
          badge === "expired" && "text-error",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export default function EntityPage() {
  const [mode, setMode] = useState<LookupMode>("id");
  const [uei, setUei] = useState(DFEAL_PROFILE.uei);
  const [cage, setCage] = useState(DFEAL_PROFILE.cage);
  const [name, setName] = useState("");
  const [entity, setEntity] = useState<SamEntity | null>(null);
  const [results, setResults] = useState<SamEntity[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SamEntity[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setEntity(null);
    setResults([]);
    setNotice(null);
    setSuggestions([]);
    setSource(null);

    try {
      const params = new URLSearchParams();
      if (mode === "name") {
        if (!name.trim()) throw new Error("Enter a legal business name to search");
        params.set("name", name.trim());
      } else {
        if (!uei.trim() && !cage.trim()) {
          throw new Error("Enter a UEI or CAGE code");
        }
        if (uei.trim()) params.set("uei", uei.trim());
        else if (cage.trim()) params.set("cage", cage.trim());
      }

      const res = await fetch(`/api/entity?${params.toString()}`);
      const data = (await res.json()) as LookupResponse;
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");

      if (data.entities?.length) {
        setResults(data.entities);
        setSource(data.source ?? "sam_search");
        return;
      }

      if (data.entity) {
        setEntity(data.entity);
        setNotice(data.notice ?? null);
        setSuggestions(data.suggestions ?? []);
        setSource(data.source ?? "sam");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  function selectEntity(selected: SamEntity) {
    setEntity(selected);
    setResults([]);
    setSource("sam_search");
    setNotice(null);
  }

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        title="SAM entity lookup"
        description="Verify vendor registration, NAICS, and active status via the SAM.gov Entity Management API."
      />

      <div className="flex gap-2">
        {(
          [
            ["id", "UEI / CAGE"],
            ["name", "Search by name"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              mode === id
                ? "bg-sidebar text-white"
                : "border border-border bg-bg-surface text-text-muted hover:text-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={lookup} className="mt-4 space-y-4 rounded-xl border border-border bg-bg-surface p-6">
        {mode === "id" ? (
          <>
            <label className="block text-sm">
              <span className="font-medium">UEI</span>
              <input
                value={uei}
                onChange={(e) => setUei(e.target.value)}
                placeholder="12-character Unique Entity ID"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">CAGE code</span>
              <span className="ml-2 text-xs text-text-muted">(use if UEI is blank)</span>
              <input
                value={cage}
                onChange={(e) => setCage(e.target.value)}
                placeholder="5-character CAGE"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-mono text-sm"
              />
            </label>
          </>
        ) : (
          <label className="block text-sm">
            <span className="font-medium">Legal business name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Searching SAM.gov…" : mode === "name" ? "Search entities" : "Lookup entity"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <Panel className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-text">
            {results.length} match{results.length === 1 ? "" : "es"} on SAM.gov
          </p>
          <ul className="divide-y divide-border">
            {results.map((r) => (
              <li key={`${r.uei}-${r.cage}`}>
                <button
                  type="button"
                  onClick={() => selectEntity(r)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left hover:bg-bg"
                >
                  <span>
                    <span className="font-medium text-text">{r.legal_name}</span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      UEI {r.uei}
                      {r.cage ? ` · CAGE ${r.cage}` : ""} · {r.registration_status}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-gold">View →</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {suggestions.length > 0 && (
        <Panel className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-text">
            Possible SAM matches for {DFEAL_PROFILE.legalName}
          </p>
          <ul className="divide-y divide-border">
            {suggestions.map((r) => (
              <li key={`${r.uei}-${r.cage}`}>
                <button
                  type="button"
                  onClick={() => selectEntity(r)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left hover:bg-bg"
                >
                  <span>
                    <span className="font-medium text-text">{r.legal_name}</span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      UEI {r.uei}
                      {r.cage ? ` · CAGE ${r.cage}` : ""} · {r.registration_status}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-gold">Use this record →</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {entity && (
        <div className="mt-4">
          <EntityCard entity={entity} notice={notice ?? undefined} source={source ?? undefined} />
        </div>
      )}

      {source === "profile_fallback" && (
        <p className="mt-4 text-sm text-text-muted">
          Verify registration at{" "}
          <a
            href="https://sam.gov/search/?index=entity&page=1&pageSize=25&sfm%5BsimpleSearch%5D%5BkeywordRadio%5D=ALL&sfm%5BsimpleSearch%5D%5BkeywordTag%5D=DFEAL"
            target="_blank"
            rel="noreferrer"
            className="text-gold hover:underline"
          >
            SAM.gov entity search ↗
          </a>
          . If your UEI or CAGE changed, update them in{" "}
          <Link href="/settings" className="text-gold hover:underline">
            Settings
          </Link>
          .
        </p>
      )}

      <p className="mt-6 text-xs text-text-muted">
        Requires <code className="rounded bg-bg px-1">SAM_GOV_API_KEY</code> with Entity Management
        API access.{" "}
        <Link href="/settings" className="text-gold hover:underline">
          Check platform settings →
        </Link>
      </p>
    </PageShell>
  );
}
