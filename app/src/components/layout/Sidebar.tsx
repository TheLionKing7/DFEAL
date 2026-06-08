"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAssistant } from "@/components/assistant/AssistantContext";
import { SidebarNavGroup } from "@/components/layout/SidebarNavGroup";
import { SMART_CAPTURE, TENANT } from "@/config/platform";
import { NAV_GROUPS } from "@/shared/nav-groups";
import { cn } from "@/shared/cn";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lane = searchParams.get("lane") ?? "";
  const { closeAssistant, openAssistant } = useAssistant();

  function onNavigate() {
    closeAssistant();
    onClose();
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[13.5rem] shrink-0 flex-col border-r border-sidebar-surface bg-sidebar text-white lg:static",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-white/10 px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <Link href="/explore" onClick={onClose} className="min-w-0">
              <p className="text-sm font-bold tracking-wide">{SMART_CAPTURE.name}</p>
              <p className="text-[10px] leading-tight text-sidebar-muted">
                {SMART_CAPTURE.tagline}
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-gold/90">{TENANT.legalName}</p>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-sidebar-muted hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="border-b border-white/10 px-2 py-2">
          <button
            type="button"
            onClick={() => {
              openAssistant({ newChat: true });
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-md bg-gold/15 px-3 py-2 text-left text-[13px] font-medium text-gold hover:bg-gold/20"
          >
            <span className="text-base">✦</span>
            {TENANT.assistantName}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-1 py-1">
          {NAV_GROUPS.map((group) => (
            <SidebarNavGroup
              key={group.id}
              group={group}
              pathname={pathname}
              lane={lane}
              onNavigate={onNavigate}
              defaultOpen={
                group.id === "opportunities" ||
                group.id === "capture" ||
                group.items.some((item) => {
                  if (item.lane) return pathname === "/opportunities" && lane === item.lane;
                  return pathname === item.href || pathname.startsWith(`${item.href}/`);
                })
              }
            />
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-2">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "block rounded-md px-3 py-1.5 text-[13px]",
              pathname === "/settings"
                ? "bg-gold/15 text-gold"
                : "text-sidebar-muted hover:bg-white/5 hover:text-white",
            )}
          >
            Settings
          </Link>
          <p className="px-3 py-1 text-[9px] leading-snug text-sidebar-muted">
            {SMART_CAPTURE.copyright}
            <br />
            <a
              href={SMART_CAPTURE.parentUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              {SMART_CAPTURE.parentCompany}
            </a>
          </p>
        </div>
      </aside>
    </>
  );
}
