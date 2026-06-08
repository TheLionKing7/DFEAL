import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";

export default function VendorsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Teaming vendors"
        description="Track potential teaming partners and subcontractor relationships for capture."
      />
      <Panel>
        <p className="text-sm text-text-muted">
          Vendor teaming intelligence will integrate with SAM entity data and pursuit notes.
          Ask the AI assistant for teaming recommendations on active opportunities.
        </p>
      </Panel>
    </PageShell>
  );
}
