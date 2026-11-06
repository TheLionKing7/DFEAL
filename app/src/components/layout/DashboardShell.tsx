"use client";

import { Suspense, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AssistantProvider } from "@/components/assistant/AssistantContext";
import { AssistantLauncher } from "@/components/assistant/AssistantLauncher";
import { PageContextProvider } from "@/components/assistant/PageContextProvider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AssistantProvider>
      <PageContextProvider>
        <div className="flex h-screen overflow-hidden bg-bg">
          <Suspense fallback={<div className="hidden w-[13.5rem] shrink-0 lg:block" />}>
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          </Suspense>

          <div className="flex min-w-0 flex-1 flex-col">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="relative min-h-0 flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-24">{children}</main>
          </div>
        </div>
        <AssistantLauncher />
      </PageContextProvider>
    </AssistantProvider>
  );
}
