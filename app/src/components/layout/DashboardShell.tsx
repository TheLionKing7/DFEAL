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
      <Suspense fallback={<div className="hidden w-[13.5rem] shrink-0 lg:block" />}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          alertCount={alertCount}
          assistantOpen={open}
        />
        <main className="relative flex min-h-0 flex-1 overflow-hidden">
          {!open && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</div>
          )}
          {open && (
            <>
              <button
                type="button"
                aria-label="Close AI"
                className="absolute inset-0 z-20 bg-black/20 lg:hidden"
                onClick={closeAssistant}
              />
              <div className="relative z-30 flex min-h-0 w-full flex-1">
                <Suspense
                  fallback={<div className="p-6 text-sm text-text-muted">Loading AI…</div>}
                >
                  <AssistantWorkspace fullPage onClose={closeAssistant} />
                </Suspense>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
