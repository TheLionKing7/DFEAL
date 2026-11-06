"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAssistant } from "@/components/assistant/AssistantContext";
import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";
import { useFirm } from "@/components/firm/FirmProvider";
import { cn } from "@/shared/cn";

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 2.5l1.9 5.6a3 3 0 001.9 1.9l5.6 1.9-5.6 1.9a3 3 0 00-1.9 1.9L12 21.5l-1.9-5.8a3 3 0 00-1.9-1.9L2.6 11.9l5.6-1.9a3 3 0 001.9-1.9L12 2.5z"
        fill="currentColor"
      />
      <path d="M19 2.5l.6 1.7a1 1 0 00.6.6l1.7.6-1.7.6a1 1 0 00-.6.6L19 8.3l-.6-1.7a1 1 0 00-.6-.6l-1.7-.6 1.7-.6a1 1 0 00.6-.6L19 2.5z" fill="currentColor" opacity=".7" />
    </svg>
  );
}

/** `?ask=…` deep links (briefing emails, legacy links) open the assistant with that question. */
function AskParamHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openAssistant } = useAssistant();
  useEffect(() => {
    const ask = params.get("ask");
    if (!ask) return;
    openAssistant({ query: ask, newChat: true });
    const next = new URLSearchParams(params.toString());
    next.delete("ask");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [params, pathname, router, openAssistant]);
  return null;
}

/** Floating bottom-right assistant: launcher button + chat window. */
export function AssistantLauncher() {
  const firm = useFirm();
  const { open, expanded, openAssistant, closeAssistant } = useAssistant();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closeAssistant();
        else openAssistant();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openAssistant, closeAssistant]);

  return (
    <>
      <Suspense fallback={null}>
        <AskParamHandler />
      </Suspense>

      {open && (
        <div
          className={cn(
            "fixed z-[60] flex overflow-hidden border border-border bg-bg shadow-2xl",
            expanded
              ? "inset-2 rounded-2xl md:inset-4"
              : "inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(760px,calc(100vh-8rem))] sm:w-[min(980px,calc(100vw-3rem))] sm:rounded-2xl",
          )}
          role="dialog"
          aria-label={firm.assistantName}
        >
          <AssistantWorkspace />
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? closeAssistant() : openAssistant())}
        className={cn(
          "fixed bottom-6 right-6 z-[61] flex items-center gap-2 rounded-full shadow-xl ring-1 ring-black/5 transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-gold",
          open ? "bg-sidebar p-4 text-white" : "bg-sidebar py-3 pl-3 pr-5 text-gold",
          open && "max-sm:hidden",
        )}
        aria-label={open ? `Close ${firm.assistantName}` : `Open ${firm.assistantName}`}
        title={`${firm.assistantName} (Ctrl/⌘ K)`}
      >
        {open ? (
          <span className="text-lg leading-none">✕</span>
        ) : (
          <>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15">
              <SparkIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">Ask {firm.shortName}&apos;s AI</span>
          </>
        )}
      </button>
    </>
  );
}
