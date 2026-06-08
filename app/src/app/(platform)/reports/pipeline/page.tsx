import Link from "next/link";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";

export default function PipelineReportPage() {
  return (
    <PageShell>
      <PageHeader
        title="Pipeline summary"
        description="Active pursuits and stage distribution across your capture pipeline."
      />
      <Panel>
        <p className="text-sm text-text-muted">
          View and manage active pursuits on the{" "}
          <Link href="/watchlist" className="font-medium text-gold hover:underline">
            Pursuits
          </Link>{" "}
          page. Full pipeline analytics will aggregate pursuit stages and fit scores here.
        </p>
      </Panel>
    </PageShell>
  );
}
