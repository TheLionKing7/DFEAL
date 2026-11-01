import Link from "next/link";
import { SMART_CAPTURE } from "@/config/platform";
import { requirePlatformAdminPage } from "@/lib/firms/context";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdminPage();
  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-sidebar text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 text-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold">{SMART_CAPTURE.name}</span>
            <span className="rounded bg-gold/20 px-2 py-0.5 text-xs text-gold">Platform admin</span>
            <Link href="/admin/firms" className="text-sidebar-muted hover:text-white">
              Firms
            </Link>
            <Link href="/explore" className="text-sidebar-muted hover:text-white">
              Workspace
            </Link>
          </div>
          <span className="text-xs text-sidebar-muted">{admin.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
