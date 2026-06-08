import { DFEAL_PROFILE, getDfealNaicsCodes } from "@/config/dfeal-profile";
import { hasAnthropicApiKey, hasGroqApiKey } from "@/lib/env";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { listConnectorStatus } from "@/lib/sled/registry";

export default function SettingsPage() {
  const naics = getDfealNaicsCodes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-2 text-text-muted">DFEAL company profile and platform status.</p>
      </div>

      <section className="rounded-xl border border-border bg-bg-surface p-6 text-sm">
        <h2 className="font-semibold">Company profile</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-text-muted">Legal name</dt>
            <dd>{DFEAL_PROFILE.legalName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-text-muted">UEI / CAGE</dt>
            <dd>
              {DFEAL_PROFILE.uei} / {DFEAL_PROFILE.cage}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-text-muted">Primary NAICS</dt>
            <dd>{DFEAL_PROFILE.primaryNaics}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-text-muted">Team contact</dt>
            <dd>{DFEAL_PROFILE.teamContactEmail}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-text-muted">
          All NAICS: {naics.join(", ")}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-bg-surface p-6 text-sm">
        <h2 className="font-semibold">Platform status</h2>
        <ul className="mt-4 space-y-2">
          <StatusRow label="Supabase database" ok={isDatabaseConfigured()} />
          <StatusRow label="Claude (Anthropic)" ok={hasAnthropicApiKey()} />
          <StatusRow label="Groq fallback" ok={hasGroqApiKey()} />
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-bg-surface p-6 text-sm">
        <h2 className="font-semibold">Phase 3 — SLED connectors</h2>
        <ul className="mt-4 space-y-3">
          {listConnectorStatus().map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-text-muted">{c.description}</p>
              </div>
              <span
                className={
                  c.status === "live"
                    ? "text-success"
                    : c.status === "credentials_required"
                      ? "text-gold"
                      : "text-text-muted"
                }
              >
                {c.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className={ok ? "text-success" : "text-text-muted"}>
        {ok ? "Configured" : "Not configured"}
      </span>
    </li>
  );
}
