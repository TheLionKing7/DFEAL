"use client";

import { Suspense, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AssistantProvider, useAssistant } from "@/components/assistant/AssistantContext";
import { PageContextProvider } from "@/components/assistant/PageContextProvider";
import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";

export function DashboardShell({
  children,
  alertCount = 0,
}: {
  children: React.ReactNode;
  alertCount?: number;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AssistantProvider>
      <PageContextProvider>
        <DashboardShellInner
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          alertCount={alertCount}
        >
          {children}
        </DashboardShellInner>
      </PageContextProvider>
    </AssistantProvider>
  );
}

function DashboardShellInner({
  children,
  sidebarOpen,
  setSidebarOpen,
  alertCount,
}: {
  children: React.ReactNode;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  alertCount?: number;
}) {
  const { open, closeAssistant } = useAssistant();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Suspense fallback={<div className="hidden w-64 shrink-0 lg:block" />}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          alertCount={alertCount}
          assistantOpen={open}
        />
        <main className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</div>
          {open && (
            <>
              <button
                type="button"
                aria-label="Close AI panel"
                className="absolute inset-0 z-20 bg-black/30 lg:hidden"
                onClick={closeAssistant}
              />
              <aside className="absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-border bg-bg shadow-xl lg:static lg:max-w-lg">
                <Suspense fallback={<div className="p-6 text-sm text-text-muted">Loading AI…</div>}>
                  <AssistantWorkspace embedded />
                </Suspense>
              </aside>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
