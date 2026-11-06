import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { SettingsTabs, type SettingsTabId } from "@/components/settings/SettingsTabs";
import { hasAnthropicApiKey, hasDeepseekApiKey, hasGroqApiKey } from "@/lib/env";
import { isOAuthConfigured } from "@/lib/connectors/oauth";
import { hasRole, requireFirmPage } from "@/lib/firms/context";
import { firmToForm } from "@/lib/firms/form-values";
import { getFirmById, listFirmMembers } from "@/lib/firms/repository";
import { getUserProfile, profileNames } from "@/lib/onboarding/profile";
import { isEncryptionConfigured } from "@/lib/security/crypto";
import { listConnectorStatus } from "@/lib/sled/registry";

export const dynamic = "force-dynamic";

const TAB_IDS: SettingsTabId[] = ["company", "workspace", "documents", "team", "notifications", "integrations", "profile", "system"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; welcome?: string }> }) {
  const params = await searchParams;
  const ctx = await requireFirmPage();
  const canEdit = hasRole(ctx, "admin");
  const [members, otherFirms, profile] = await Promise.all([
    listFirmMembers(ctx.firm.id),
    Promise.all(ctx.memberships.map((m) => getFirmById(m.firmId))),
    getUserProfile(ctx.user.email),
  ]);
  const names = await profileNames(members.map((m) => m.email)).catch(() => ({} as Record<string, string>));
  const firms = otherFirms.filter((f): f is NonNullable<typeof f> => Boolean(f)).map((f) => ({ id: f.id, name: f.legalName }));
  const initialTab = TAB_IDS.includes(params.tab as SettingsTabId) ? (params.tab as SettingsTabId) : "company";

  const status = (
    <Panel title="Platform status">
      <ul className="space-y-2 text-sm">
        <StatusRow label="DeepSeek (primary LLM)" ok={hasDeepseekApiKey()} />
        <StatusRow label="Groq (fallback)" ok={hasGroqApiKey()} />
        <StatusRow label="Claude (fallback)" ok={hasAnthropicApiKey()} />
        <StatusRow label="Platform email (Resend)" ok={Boolean(process.env.RESEND_API_KEY?.trim())} />
        <StatusRow label="Connector encryption key" ok={isEncryptionConfigured()} />
        <StatusRow label="Google OAuth app" ok={isOAuthConfigured("google")} />
        <StatusRow label="Microsoft OAuth app" ok={isOAuthConfigured("microsoft")} />
      </ul>
      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">Opportunity sources</h3>
      <ul className="mt-3 space-y-3 text-sm">
        {listConnectorStatus().map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-text-muted">{c.description}</p>
            </div>
            <span className={c.status === "live" ? "text-success" : c.status === "credentials_required" ? "text-gold" : "text-text-muted"}>
              {c.status.replace("_", " ")}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );

  return (
    <PageShell className="max-w-5xl">
      <PageHeader
        title="Firm profile & settings"
        description={`Control how ${ctx.firm.legalName}'s workspace is set up — profile, NAICS and markets, team, notifications and integrations. Saving profile or workspace changes re-scores your feed.`}
      />
      <SettingsTabs
        initialTab={initialTab}
        welcome={params.welcome === "1"}
        firmForm={firmToForm(ctx.firm)}
        canEdit={canEdit}
        isOwner={hasRole(ctx, "owner")}
        members={members.map((m) => ({ ...m, name: names[m.email] ?? null }))}
        currentEmail={ctx.user.email}
        profile={{
          fullName: profile?.full_name ?? "",
          jobTitle: profile?.job_title ?? "",
          phone: profile?.phone ?? "",
          timezone: profile?.timezone ?? "",
        }}
        firms={firms}
        activeFirmId={ctx.firm.id}
        status={status}
      />
    </PageShell>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className={ok ? "text-success" : "text-text-muted"}>{ok ? "Configured" : "Not configured"}</span>
    </li>
  );
}
