"use client";

import { useAssistant } from "@/components/assistant/AssistantContext";
import { BriefingContent } from "@/components/briefing/BriefingContent";
import { useFirm } from "@/components/firm/FirmProvider";
import { PageHeader, PageShell } from "@/components/layout/PageShell";

export default function BriefingPage() {
  const firm = useFirm();
  const { openAssistant } = useAssistant();
  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        title="Daily Briefing"
        description={`Today's capture journal for ${firm.legalName} — industry pulse, best-fit opportunities across your lanes, deadlines, pursuits and agent activity. Refreshed every morning by the daily pipeline.`}
      />
      <BriefingContent firmId={firm.id} onAsk={(q) => openAssistant({ query: q, newChat: true })} />
    </PageShell>
  );
}
