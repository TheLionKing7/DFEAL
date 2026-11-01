import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { FirmProvider } from "@/components/firm/FirmProvider";
import { requireFirmPage } from "@/lib/firms/context";
import { toFirmClientInfo } from "@/lib/firms/types";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireFirmPage();

  return (
    <FirmProvider firm={toFirmClientInfo(ctx.firm, ctx.role, ctx.user.isPlatformAdmin)}>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center text-sm text-text-muted">
            Loading workspace…
          </div>
        }
      >
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </FirmProvider>
  );
}
