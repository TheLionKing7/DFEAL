"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AssistantView = "chat" | "briefing" | "automations";

export interface OpenAssistantOptions {
  query?: string;
  newChat?: boolean;
  view?: AssistantView;
}

interface AssistantContextValue {
  open: boolean;
  expanded: boolean;
  view: AssistantView;
  initialQuery: string | null;
  newChat: boolean;
  /** Increments on every openAssistant() so effects re-run for repeated requests. */
  requestId: number;
  openAssistant: (opts?: OpenAssistantOptions) => void;
  closeAssistant: () => void;
  toggleExpanded: () => void;
  setView: (view: AssistantView) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<AssistantView>("chat");
  const [initialQuery, setInitialQuery] = useState<string | null>(null);
  const [newChat, setNewChat] = useState(false);
  const [requestId, setRequestId] = useState(0);

  const openAssistant = useCallback((opts?: OpenAssistantOptions) => {
    setInitialQuery(opts?.query?.trim() || null);
    setNewChat(Boolean(opts?.newChat));
    setView(opts?.view ?? "chat");
    setRequestId((n) => n + 1);
    setOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setOpen(false);
    setInitialQuery(null);
    setNewChat(false);
  }, []);

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  const value = useMemo(
    () => ({ open, expanded, view, initialQuery, newChat, requestId, openAssistant, closeAssistant, toggleExpanded, setView }),
    [open, expanded, view, initialQuery, newChat, requestId, openAssistant, closeAssistant, toggleExpanded],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
