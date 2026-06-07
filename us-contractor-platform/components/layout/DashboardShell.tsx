'use client';

import { Suspense, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AssistantProvider, useAssistant } from '../assistant/AssistantContext';
import { PageContextProvider } from '../assistant/PageContextProvider';
import { AssistantWorkspace } from '../assistant/AssistantWorkspace';

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
        <DashboardShellInner sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} alertCount={alertCount}>
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
  const { open } = useAssistant();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Suspense fallback={<div className="hidden w-64 shrink-0 lg:block" />}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} alertCount={alertCount} assistantOpen={open} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          {open ? (
            <Suspense fallback={<div className="p-6 text-sm text-text-muted">Loading AI…</div>}>
              <AssistantWorkspace embedded />
            </Suspense>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 lg:p-6">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
