import Link from "next/link";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { DOCUMENT_TYPES } from "@/shared/opportunity-lanes";

export default function TemplatesPage() {
  return (
    <PageShell>
      <PageHeader
        title="Proposal templates"
        description="Reference structures for AI-generated proposal sections. PDF exports use DFEAL-branded formatting."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {DOCUMENT_TYPES.map((dt) => (
          <Panel key={dt.id} title={dt.label}>
            <p className="text-sm text-text-muted">
              Standard {dt.label.toLowerCase()} section for federal and SLED proposals.
            </p>
            <p className="mt-2 text-xs text-text-muted">
              Generate from an opportunity workspace, then download as PDF from{" "}
              <Link href="/documents" className="text-gold hover:underline">
                Generated proposals
              </Link>
              .
            </p>
          </Panel>
        ))}
      </div>
    </PageShell>
  );
}
