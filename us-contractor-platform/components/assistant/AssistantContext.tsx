'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface OpenAssistantOptions {
  query?: string;
  newChat?: boolean;
}

interface AssistantContextValue {
  open: boolean;
  initialQuery: string | null;
  newChat: boolean;
  openAssistant: (opts?: OpenAssistantOptions) => void;
  closeAssistant: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);
  const [newChat, setNewChat] = useState(false);

  const openAssistant = useCallback((opts?: OpenAssistantOptions) => {
    setInitialQuery(opts?.query?.trim() || null);
    setNewChat(Boolean(opts?.newChat));
    setOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setOpen(false);
    setInitialQuery(null);
    setNewChat(false);
  }, []);

  const value = useMemo(
    () => ({ open, initialQuery, newChat, openAssistant, closeAssistant }),
    [open, initialQuery, newChat, openAssistant, closeAssistant],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
}
