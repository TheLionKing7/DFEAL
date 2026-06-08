import Link from "next/link";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";

export default function ScoringReportPage() {
  return (
    <PageShell>
      <PageHeader
        title="Scoring analytics"
        description="Fit scores, go/no-go trends, and opportunity lane performance."
      />
      <Panel>
        <p className="text-sm text-text-muted">
          Run AI go/no-go analysis from any{" "}
          <Link href="/opportunities" className="font-medium text-gold hover:underline">
            opportunity workspace
          </Link>
          . Aggregated scoring reports across lanes will appear here as pursuit volume grows.
        </p>
      </Panel>
    </PageShell>
  );
}
