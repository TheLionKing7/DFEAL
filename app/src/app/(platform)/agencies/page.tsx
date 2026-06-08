import Link from "next/link";
import { listAgencySummaries } from "@/lib/db/opportunities";

export const dynamic = "force-dynamic";

export default async function AgenciesPage() {
  let agencies: Awaited<ReturnType<typeof listAgencySummaries>> = [];
  let error: string | null = null;

  try {
    agencies = await listAgencySummaries(40);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load agencies";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agencies</h1>
        <p className="mt-2 text-text-muted">
          Contracting offices appearing in your ingested SAM opportunities.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-text-muted">
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Active notices</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.agency_name} className="border-b border-border/60">
                <td className="px-4 py-3 font-medium">{a.agency_name}</td>
                <td className="px-4 py-3">{a.count}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/opportunities?q=${encodeURIComponent(a.agency_name)}`}
                    className="text-gold hover:underline"
                  >
                    View opportunities
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
