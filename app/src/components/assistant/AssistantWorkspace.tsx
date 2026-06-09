"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AssistantSidebarNav } from "@/components/assistant/AssistantSidebar";
import { ChatMessageContent } from "@/components/assistant/ChatMessageContent";
import { InlineAnalysisPanel } from "@/components/assistant/InlineAnalysisPanel";
import { useAssistant } from "@/components/assistant/AssistantContext";
import { usePageContext } from "@/components/assistant/PageContextProvider";
import { TENANT } from "@/config/platform";
import { useOpportunityLists } from "@/hooks/useOpportunityLists";
import { ASSISTANT_PROMPTS } from "@/shared/nav-groups";
import { cn } from "@/shared/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  updated_at: string;
}

export function AssistantWorkspace({
  fullPage = false,
  onClose,
}: {
  fullPage?: boolean;
  onClose?: () => void;
}) {
  const { closeAssistant, initialQuery, newChat } = useAssistant();
  const { pageContext } = usePageContext();
  const { trackItems, favoriteItems, refresh: refreshLists } = useOpportunityLists();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [projectPanel, setProjectPanel] = useState<"none" | "track" | "favorite">("none");
  const [inlineAnalysis, setInlineAnalysis] = useState<{ id: string; title: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleClose = onClose ?? closeAssistant;

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/sessions");
      const data = (await res.json()) as { sessions?: ChatSession[] };
      setSessions(data.sessions ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setProjectPanel("none");
    try {
      const res = await fetch(`/api/assistant/sessions?session_id=${id}`);
      const data = (await res.json()) as {
        messages?: { role: string; content: string }[];
      };
      setSessionId(id);
      setMessages(
        (data.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setInput("");
    setInlineAnalysis(null);
    setProjectPanel("none");
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setLoading(true);
      setInput("");
      setInlineAnalysis(null);
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
        void loadSessions();
        void refreshLists();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pageContext, sessionId, loadSessions, refreshLists],
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (newChat) startNewChat();
  }, [newChat, startNewChat]);

  useEffect(() => {
    if (initialQuery) void sendMessage(initialQuery);
  }, [initialQuery, sendMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, inlineAnalysis]);

  const filteredSessions = sessions.filter((s) =>
    (s.title ?? "Chat").toLowerCase().includes(search.toLowerCase()),
  );

  const handleAnalyzeInChat = useCallback((id: string, title: string) => {
    setInlineAnalysis({ id, title });
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-bg">
      <AssistantSidebarNav
        onNewChat={startNewChat}
        onSearchFocus={() => searchRef.current?.focus()}
        sessions={filteredSessions}
        sessionId={sessionId}
        onSelectSession={(id) => void loadSession(id)}
        search={search}
        onSearchChange={setSearch}
        projectPanel={projectPanel}
        onProjectPanelChange={setProjectPanel}
        trackItems={trackItems}
        favoriteItems={favoriteItems}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-[#faf9f7]">
        {pageContext.page !== "unknown" && (
          <div className="border-b border-gold/20 bg-gold/[0.08] px-4 py-2.5 text-xs text-text">
            <span className="font-semibold uppercase tracking-wide text-gold">Context</span>
            <span className="mx-2 text-text-muted">·</span>
            <span className="text-text-muted">{pageContext.summary ?? pageContext.label}</span>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 lg:px-10">
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-2xl flex-col pt-6 lg:pt-12">
              <h2 className="text-center text-2xl font-bold text-text lg:text-3xl">
                How can I help with capture today?
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-center text-sm text-text-muted">
                Professional, context-aware intelligence for {TENANT.legalName}. Every opportunity I
                mention is clickable — hover for pursuit, track, favourite, or analyze.
              </p>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {ASSISTANT_PROMPTS.slice(0, 2).map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => void sendMessage(card.prompt)}
                    className="rounded-2xl border border-border bg-bg-surface p-5 text-left shadow-sm transition hover:border-gold/35 hover:shadow-md"
                  >
                    <p className="text-sm font-semibold text-text">{card.title}</p>
                    <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-text-muted">
                      {card.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-4 py-3 md:max-w-[85%]",
                    msg.role === "user"
                      ? "bg-sidebar text-white shadow-sm"
                      : "border border-border/80 bg-bg-surface shadow-sm",
                  )}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <ChatMessageContent
                      content={msg.content}
                      role="assistant"
                      onAnalyzeInChat={handleAnalyzeInChat}
                    />
                  )}
                </div>
              </div>
            ))}

            {inlineAnalysis && (
              <InlineAnalysisPanel
                opportunityId={inlineAnalysis.id}
                title={inlineAnalysis.title}
                onClose={() => setInlineAnalysis(null)}
                embedded
              />
            )}

            {loading && (
              <p className="text-center text-sm text-text-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                  Thinking…
                </span>
              </p>
            )}

            {error && (
              <p className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}
          </div>
        </div>

        <footer className="border-t border-border bg-bg-surface/80 px-4 py-4 backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="mx-auto flex max-w-3xl items-end gap-2"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder="Ask me anything…"
              className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-border bg-bg px-4 py-3 text-sm shadow-inner focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/15"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-sidebar shadow-sm transition hover:bg-gold/90 disabled:opacity-50"
            >
              Send
            </button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-text-muted">
            {TENANT.assistantName} can make mistakes. Verify important capture decisions.
          </p>
        </footer>

        {fullPage && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-muted md:hidden"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
