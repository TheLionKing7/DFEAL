"use client";

import { createContext, useContext } from "react";
import type { FirmClientInfo } from "@/lib/firms/types";

const FirmContext = createContext<FirmClientInfo | null>(null);

export function FirmProvider({
  firm,
  children,
}: {
  firm: FirmClientInfo;
  children: React.ReactNode;
}) {
  return <FirmContext.Provider value={firm}>{children}</FirmContext.Provider>;
}

/** Current firm for client components rendered inside the platform layout. */
export function useFirm(): FirmClientInfo {
  const firm = useContext(FirmContext);
  if (!firm) throw new Error("useFirm must be used inside <FirmProvider>");
  return firm;
}
