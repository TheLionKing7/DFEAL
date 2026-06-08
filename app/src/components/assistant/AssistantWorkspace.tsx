"use client";

import { useCallback, useEffect, useState } from "react";
import { useAssistant } from "@/components/assistant/AssistantContext";
import { usePageContext } from "@/components/assistant/PageContextProvider";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AssistantWorkspace({ embedded = false }: { embedded?: boolean }) {
  const { closeAssistant, initialQuery, newChat } = useAssistant();
  const { pageContext } = usePageContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setLoading(true);
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            session_id: sessionId,
            page_context: pageContext,
            history: messages,
          }),
        });

        const data = (await response.json()) as {
          reply?: string;
          session_id?: string;
          error?: string;
        };

        if (!response.ok) throw new Error(data.error ?? "Chat failed");

        if (data.session_id) setSessionId(data.session_id);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply ?? "" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pageContext, sessionId],
  );

  useEffect(() => {
    if (newChat) {
      setMessages([]);
      setSessionId(null);
      setError(null);
    }
  }, [newChat]);

  useEffect(() => {
    if (initialQuery) {
      void sendMessage(initialQuery);
    }
  }, [initialQuery, sendMessage]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-bg">
      <div className="flex min-w-0 flex-1 flex-col">
        {embedded && pageContext.page !== "unknown" && (
          <div className="border-b border-border bg-gold/[0.06] px-4 py-2 text-xs text-text-muted">
            <span className="font-semibold uppercase text-gold">Context</span>
            <span className="mx-2">·</span>
            {pageContext.summary ?? pageContext.label}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-bold text-text">DFEAL AI consultant</h2>
              <p className="mt-2 max-w-md text-sm text-text-muted">
                Ask about bid/no-bid, teaming, proposal strategy, compliance, or this
                page&apos;s opportunities.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "Should we pursue this opportunity?",
                  "Draft a capture plan outline",
                  "What are our compliance risks?",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-gold/40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-3xl rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "ml-auto bg-sidebar text-white"
                  : "border border-border bg-bg-surface text-text"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}

          {loading && (
            <p className="text-sm text-text-muted">Thinking…</p>
          )}
          {error && (
            <p className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
        </div>

        <footer className="border-t border-border p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about capture strategy, compliance, teaming…"
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-sidebar px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </footer>

        {embedded && (
          <button
            type="button"
            onClick={closeAssistant}
            className="absolute right-4 top-20 text-xs text-text-muted hover:text-gold lg:hidden"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
