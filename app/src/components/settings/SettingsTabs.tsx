"use client";

import { useState } from "react";
import { ConnectorsManager } from "@/components/connectors/ConnectorsManager";
import { ReferenceDocumentsManager } from "@/components/documents/ReferenceDocumentsManager";
import { FirmForm } from "@/components/firm/FirmForm";
import type { FirmSectionId } from "@/components/firm/FirmSections";
import { FirmSwitcher } from "@/components/firm/FirmSwitcher";
import { TeamPanel, type TeamMember } from "@/components/firm/TeamPanel";
import { ProfileForm } from "@/components/settings/ProfileForm";
import type { FirmFormValues } from "@/lib/firms/form-values";
import { cn } from "@/shared/cn";

const TABS = [
  { id: "company", label: "Company profile", sections: ["identity", "narrative"] as FirmSectionId[] },
  { id: "workspace", label: "Workspace & NAICS", sections: ["industry", "workspace", "eligibility", "rules"] as FirmSectionId[] },
  { id: "documents", label: "Reference documents" },
  { id: "team", label: "Team & access" },
  { id: "notifications", label: "Notifications", sections: ["notifications"] as FirmSectionId[] },
  { id: "integrations", label: "Integrations" },
  { id: "profile", label: "My profile" },
  { id: "system", label: "Platform status" },
] as const;

export type SettingsTabId = (typeof TABS)[number]["id"];

export function SettingsTabs({
  initialTab,
  welcome,
  firmForm,
  canEdit,
  isOwner,
  members,
  currentEmail,
  profile,
  firms,
  activeFirmId,
  status,
}: {
  initialTab: SettingsTabId;
  welcome?: boolean;
  firmForm: FirmFormValues;
  canEdit: boolean;
  isOwner: boolean;
  members: TeamMember[];
  currentEmail: string;
  profile: { fullName: string; jobTitle: string; phone: string; timezone: string };
  firms: { id: string; name: string }[];
  activeFirmId: string;
  status: React.ReactNode;
}) {
  const [tab, setTab] = useState<SettingsTabId>(initialTab);
  const [formSections, setFormSections] = useState<FirmSectionId[]>(
    (TABS.find((t) => t.id === initialTab && "sections" in t) as { sections: FirmSectionId[] } | undefined)?.sections ??
      ["identity", "narrative"],
  );
  const isFormTab = TABS.some((t) => t.id === tab && "sections" in t);

  function select(id: SettingsTabId) {
    setTab(id);
    const t = TABS.find((x) => x.id === id);
    if (t && "sections" in t) setFormSections(t.sections);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="rounded-xl border border-gold/40 bg-gold/[0.06] p-4 text-sm">
          <p className="font-semibold">Your workspace is ready.</p>
          <p className="mt-1 text-text-muted">
            One last step: upload your reference documents (capability statement, past proposals, RFI responses,
            resumes) so the agents draft in your voice. You can also do this later from Settings.{" "}
            <a href="/explore" className="text-gold hover:underline">
              Skip to your opportunity feed →
            </a>
          </p>
        </div>
      )}
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              tab === t.id ? "border-gold font-medium text-text" : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* One form instance for all profile tabs so edits survive tab switches. */}
      <div hidden={!isFormTab}>
        {!canEdit && (
          <p className="mb-4 rounded-lg border border-border bg-bg-surface px-4 py-3 text-xs text-text-muted">
            You have read-only access. Ask a workspace admin or owner to make changes.
          </p>
        )}
        <FirmForm mode="edit" initial={firmForm} sections={formSections} readOnly={!canEdit} />
      </div>

      {tab === "documents" && (
        <section className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm lg:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Reference documents</h2>
          <p className="mb-4 mt-1 text-xs text-text-muted">
            Your own capability statements, past proposals, RFI and sources-sought responses, resumes and boilerplate.
            The drafting agents read the most relevant ones every time they write a document for this workspace, so
            drafts follow your voice, structure and real facts. Every member of the workspace can add documents.
          </p>
          <ReferenceDocumentsManager currentEmail={currentEmail} />
        </section>
      )}

      {tab === "team" && (
        <section className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm lg:p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide">People in this workspace</h2>
          <TeamPanel initialMembers={members} canManage={canEdit} isOwner={isOwner} currentEmail={currentEmail} />
          {firms.length > 1 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Your workspaces</h3>
              <FirmSwitcher firms={firms} activeId={activeFirmId} />
            </div>
          )}
        </section>
      )}

      {tab === "integrations" && (
        <section className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm lg:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Integrations & connectors</h2>
          <p className="mb-4 mt-1 text-xs text-text-muted">
            Connect email, calendars, Slack/Teams, Zapier and MCP servers. Automations and the assistant use these to
            notify your team and take actions.
          </p>
          <ConnectorsManager />
        </section>
      )}

      {tab === "profile" && <ProfileForm email={currentEmail} initial={profile} />}

      {tab === "system" && status}
    </div>
  );
}
