"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  derivePageContextFromPath,
  type AssistantPageContext,
} from "@/shared/assistant-page-context";

interface PageContextValue {
  pageContext: AssistantPageContext;
  registerPageContext: (patch: Partial<AssistantPageContext>) => void;
  clearPageContextOverride: () => void;
}

const PageContext = createContext<PageContextValue | null>(null);

export function PageContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [override, setOverride] = useState<Partial<AssistantPageContext> | null>(null);

  const baseContext = useMemo(
    () => derivePageContextFromPath(pathname, searchParams),
    [pathname, searchParams],
  );

  useEffect(() => {
    setOverride(null);
  }, [pathname]);

  const registerPageContext = useCallback((patch: Partial<AssistantPageContext>) => {
    setOverride((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearPageContextOverride = useCallback(() => {
    setOverride(null);
  }, []);

  const pageContext = useMemo(
    (): AssistantPageContext => ({
      ...baseContext,
      ...override,
      meta: { ...baseContext.meta, ...override?.meta },
    }),
    [baseContext, override],
  );

  return (
    <PageContext.Provider
      value={{ pageContext, registerPageContext, clearPageContextOverride }}
    >
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error("usePageContext must be used within PageContextProvider");
  return ctx;
}

export function useRegisterPageContext(
  patch: Partial<AssistantPageContext> | null,
  deps: unknown[] = [],
) {
  const { registerPageContext, clearPageContextOverride } = usePageContext();

  useEffect(() => {
    if (!patch) {
      clearPageContextOverride();
      return;
    }
    registerPageContext(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
