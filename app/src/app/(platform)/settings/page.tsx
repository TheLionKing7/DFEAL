import { FirmForm, firmToForm } from "@/components/firm/FirmForm";
import { FirmSwitcher } from "@/components/firm/FirmSwitcher";
import { TeamPanel } from "@/components/firm/TeamPanel";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { hasDeepseekApiKey, hasAnthropicApiKey, hasGroqApiKey } from "@/lib/env";
import { hasRole, requireFirmPage } from "@/lib/firms/context";
import { getFirmById, listFirmMembers } from "@/lib/firms/repository";
import { listConnectorStatus } from "@/lib/sled/registry";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireFirmPage();
  const canEdit = hasRole(ctx, "admin");
  const [members, otherFirms] = await Promise.all([
    listFirmMembers(ctx.firm.id),
    Promise.all(ctx.memberships.map((m) => getFirmById(m.firmId))),
  ]);
  const switchable = otherFirms
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .map((f) => ({ id: f.id, name: f.legalName }));

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        title="Firm profile & settings"
        description={
          canEdit
            ? `Manage ${ctx.firm.legalName}'s NAICS codes, industry, scoring rules, and team. Saving re-scores the opportunity feed.`
            : `${ctx.firm.legalName}'s capture profile. Ask a firm admin to make changes.`
        }
      />

      <FirmForm mode="edit" initial={firmToForm(ctx.firm)} readOnly={!canEdit} />

      <Panel title="Team">
        <TeamPanel
          initialMembers={members}
          canManage={canEdit}
          currentEmail={ctx.user.email}
        />
      </Panel>

      {switchable.length > 1 && (
        <Panel title="Your firms">
          <FirmSwitcher firms={switchable} activeId={ctx.firm.id} />
        </Panel>
      )}

      <Panel title="Platform status">
        <ul className="space-y-2 text-sm">
          <StatusRow label="DeepSeek (primary LLM)" ok={hasDeepseekApiKey()} />
          <StatusRow label="Groq (fallback)" ok={hasGroqApiKey()} />
          <StatusRow label="Claude (fallback)" ok={hasAnthropicApiKey()} />
        </ul>
        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">SLED connectors</h3>
        <ul className="mt-3 space-y-3 text-sm">
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
      </Panel>
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
