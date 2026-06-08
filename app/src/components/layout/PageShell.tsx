import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-6", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-3 border-b border-border pb-5">
      {breadcrumbs}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-3xl text-sm text-text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Panel({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-bg-surface p-5 shadow-sm lg:p-6",
        className,
      )}
    >
      {title && <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text">{title}</h2>}
      {children}
    </section>
  );
}

export function Breadcrumb({ children }: { children: ReactNode }) {
  return <nav className="text-sm text-text-muted">{children}</nav>;
}
