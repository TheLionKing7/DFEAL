import Link from "next/link";
import { OnboardFirmForm } from "@/components/firm/OnboardFirmForm";

export const dynamic = "force-dynamic";

export default function NewFirmPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b border-border pb-5">
        <p className="text-sm">
          <Link href="/admin/firms" className="text-gold hover:underline">
            ← Firms
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Create a workspace directly</h1>
        <p className="text-sm text-text-muted">
          Use this when you are setting a firm up on its behalf. To let the business enter its own details, send an
          invitation from the Firms page instead.
        </p>
      </header>
      <OnboardFirmForm />
    </div>
  );
}
