import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";

export default function DigestReportPage() {
  return (
    <PageShell>
      <PageHeader
        title="Daily digest"
        description="Email digest summary and hot opportunity highlights from the daily pipeline."
      />
      <Panel>
        <p className="text-sm text-text-muted">
          Digest emails are sent to your configured team inbox after each daily ingest run.
          Use the AI assistant&apos;s <strong>Daily briefing</strong> for an on-demand summary
          of today&apos;s priorities.
        </p>
      </Panel>
    </PageShell>
  );
}
