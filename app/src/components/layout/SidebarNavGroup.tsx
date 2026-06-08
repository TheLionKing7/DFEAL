"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NavGroup } from "@/shared/nav-groups";
import { cn } from "@/shared/cn";

export function SidebarNavGroup({
  group,
  pathname,
  lane,
  onNavigate,
  defaultOpen,
}: {
  group: NavGroup;
  pathname: string;
  lane: string;
  onNavigate: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const isActive = group.items.some((item) => {
    if (item.href === "/explore") return pathname === "/explore";
    if (item.href === "/opportunities" && !item.lane) {
      return pathname === "/opportunities" && !lane;
    }
    if (item.lane) return pathname === "/opportunities" && lane === item.lane;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider",
          isActive ? "text-gold" : "text-sidebar-muted hover:text-white",
        )}
      >
        <span>{group.label}</span>
        <span className="text-[10px] opacity-70">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ul className="space-y-0.5 pb-2 pl-1">
          {group.items.map((item) => {
            const active =
              item.href === "/explore"
                ? pathname === "/explore"
                : item.href === "/opportunities" && !item.lane
                  ? pathname === "/opportunities" && !lane
                  : item.lane
                    ? pathname === "/opportunities" && lane === item.lane
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={`${item.href}-${item.lane ?? ""}`}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-md px-3 py-1.5 text-[13px] leading-snug",
                    active
                      ? "bg-gold/15 font-medium text-gold"
                      : "text-sidebar-muted hover:bg-white/5 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
