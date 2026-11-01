import Link from "next/link";
import { FirmStatusButton } from "@/components/admin/FirmStatusButton";
import { OpenFirmButton } from "@/components/admin/OpenFirmButton";
import { industryLabel } from "@/lib/firms/industries";
import { listFirms } from "@/lib/firms/repository";
import { naicsTitle } from "@/lib/naics";

export const dynamic = "force-dynamic";

export default async function AdminFirmsPage() {
  const firms = await listFirms();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold">Firms</h1>
          <p className="mt-1 text-sm text-text-muted">
            {firms.length} onboarded firm{firms.length === 1 ? "" : "s"}. Each firm gets its own scoring, feed,
            AI context, documents, and team.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white hover:bg-sidebar-surface"
        >
          + Onboard firm
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-3">Firm</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Primary NAICS</th>
              <th className="px-4 py-3">NAICS</th>
              <th className="px-4 py-3">Home</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {firms.map((f) => (
              <tr key={f.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{f.legalName}</p>
                  <p className="text-xs text-text-muted">
                    {f.slug}
                    {f.uei ? ` · UEI ${f.uei}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3">{industryLabel(f.industry)}</td>
                <td className="px-4 py-3">
                  <span className="font-mono">{f.primaryNaics}</span>
                  <p className="max-w-[16rem] text-xs text-text-muted">{naicsTitle(f.primaryNaics)}</p>
                </td>
                <td className="px-4 py-3 text-xs">{f.naicsCodes.join(", ")}</td>
                <td className="px-4 py-3">{f.homeState ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={f.status === "active" ? "text-success" : "text-error"}>{f.status}</span>
                </td>
                <td className="space-y-1 px-4 py-3 text-right">
                  <OpenFirmButton firmId={f.id} />
                  <FirmStatusButton firmId={f.id} status={f.status} />
                </td>
              </tr>
            ))}
            {firms.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  No firms yet. Run the migrations, then onboard your first firm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
