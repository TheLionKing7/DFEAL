"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AssistantSettingsMenu } from "@/components/assistant/AssistantSettingsMenu";
import { AutomationsQuickView } from "@/components/assistant/AutomationsQuickView";
import { ChatHistoryDropdown, type ChatSessionItem } from "@/components/assistant/ChatHistoryDropdown";
import { ChatMessageContent } from "@/components/assistant/ChatMessageContent";
import { InlineAnalysisPanel } from "@/components/assistant/InlineAnalysisPanel";
import { useAssistant, type AssistantView } from "@/components/assistant/AssistantContext";
import { usePageContext } from "@/components/assistant/PageContextProvider";
import { BriefingContent, briefingSeenKey } from "@/components/briefing/BriefingContent";
import { useFirm } from "@/components/firm/FirmProvider";
import { useOpportunityLists } from "@/hooks/useOpportunityLists";
import { ASSISTANT_PROMPTS } from "@/shared/nav-groups";
import { cn } from "@/shared/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  note?: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AssistantWorkspace() {
  const firm = useFirm();
  const router = useRouter();
  const { closeAssistant, initialQuery, newChat, requestId, view, setView, expanded, toggleExpanded } = useAssistant();
  const { pageContext } = usePageContext();
  const { refresh: refreshLists } = useOpportunityLists();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inlineAnalysis, setInlineAnalysis] = useState<{ id: string; title: string } | null>(null);
  const [briefingUnread, setBriefingUnread] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handledRequest = useRef(0);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/sessions");
      const data = (await res.json()) as { sessions?: ChatSessionItem[] };
      setSessions(data.sessions ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSession = useCallback(
    async (id: string) => {
      setView("chat");
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/assistant/sessions?session_id=${id}`);
        const data = (await res.json()) as { messages?: { role: string; content: string }[] };
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
    },
    [setView],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await fetch(`/api/assistant/sessions?session_id=${id}`, { method: "DELETE" });
      if (id === sessionId) {
        setSessionId(null);
        setMessages([]);
      }
      void loadSessions();
    },
    [sessionId, loadSessions],
  );

  const startNewChat = useCallback(() => {
    setView("chat");
    setMessages([]);
    setSessionId(null);
    setError(null);
    setInput("");
    setInlineAnalysis(null);
  }, [setView]);

  const sendMessage = useCallback(
    async (text: string, opts?: { fresh?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setView("chat");
      setError(null);
      setLoading(true);
      setInput("");
      setInlineAnalysis(null);
      const history = opts?.fresh ? [] : messages;
      setMessages((prev) => [...(opts?.fresh ? [] : prev), { role: "user", content: trimmed }]);

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            session_id: opts?.fresh ? null : sessionId,
            page_context: pageContext,
            history: history.map(({ role, content }) => ({ role, content })),
          }),
        });
        const data = (await response.json()) as {
          reply?: string;
          session_id?: string;
          error?: string;
          remembered?: string[];
          tools?: { tool: string; ok: boolean }[];
        };
        if (!response.ok) throw new Error(data.error ?? "Chat failed");
        if (data.session_id) setSessionId(data.session_id);
        const notes = [
          data.remembered?.length ? `Saved to memory: ${data.remembered.join(" · ")}` : "",
          data.tools?.length ? `Used tools: ${data.tools.map((t) => `${t.tool}${t.ok ? "" : " (failed)"}`).join(", ")}` : "",
        ].filter(Boolean);
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "", note: notes.join(" — ") || undefined }]);
        void loadSessions();
        void refreshLists();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pageContext, sessionId, loadSessions, refreshLists, setView],
  );

  useEffect(() => {
    void loadSessions();
    try {
      setBriefingUnread(localStorage.getItem(briefingSeenKey(firm.id)) !== todayIso());
    } catch {
      setBriefingUnread(true);
    }
    void fetch("/api/automations/events?status=pending_approval")
      .then((r) => r.json())
      .then((d: { pending?: number }) => setPendingApprovals(d.pending ?? 0))
      .catch(() => undefined);
  }, [loadSessions, firm.id]);

  // Each openAssistant() call (new chat, seeded question, view switch) is handled once.
  useEffect(() => {
    if (requestId === handledRequest.current) return;
    handledRequest.current = requestId;
    if (initialQuery) void sendMessage(initialQuery, { fresh: newChat });
    else if (newChat) startNewChat();
  }, [requestId, initialQuery, newChat, sendMessage, startNewChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, inlineAnalysis]);

  const go = (path: string) => {
    if (!expanded) closeAssistant();
    router.push(path);
  };

  const navItems: { id: AssistantView | "new"; label: string; icon: string; badge?: string | number; dot?: boolean }[] = [
    { id: "new", label: "New chat", icon: "✎" },
    { id: "briefing", label: "Daily briefing", icon: "◉", dot: briefingUnread },
    { id: "automations", label: "Automations", icon: "◷", badge: pendingApprovals || undefined },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-bg">
      {/* Header: context on the left, chat history dropdown + window controls on the right */}
      <div className="flex items-center gap-3 border-b border-gold/20 bg-gold/[0.08] px-4 py-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-gold">{firm.assistantName}</span>
        {pageContext.page !== "unknown" && (
          <span className="hidden min-w-0 truncate text-text-muted sm:inline">
            <span className="mx-1">·</span>Context: {pageContext.summary ?? pageContext.label}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ChatHistoryDropdown
            sessions={sessions}
            activeId={view === "chat" ? sessionId : null}
            onSelect={(id) => void loadSession(id)}
            onDelete={(id) => void deleteSession(id)}
            onOpen={() => void loadSessions()}
          />
          <button
            type="button"
            onClick={toggleExpanded}
            className="hidden rounded-md p-1.5 text-text-muted hover:bg-white/60 hover:text-text md:block"
            aria-label={expanded ? "Restore size" : "Expand"}
            title={expanded ? "Restore size" : "Expand"}
          >
            {expanded ? "⤡" : "⤢"}
          </button>
          <button
            type="button"
            onClick={closeAssistant}
            className="rounded-md p-1.5 text-text-muted hover:bg-white/60 hover:text-text"
            aria-label="Close assistant"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Panel: New chat, Daily briefing, Automations, Settings */}
        <aside className="flex w-14 shrink-0 flex-col border-r border-border bg-bg-surface sm:w-48">
          <nav className="space-y-0.5 p-2">
            {navItems.map((item) => {
              const active = item.id !== "new" && view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => (item.id === "new" ? startNewChat() : setView(item.id))}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
                    active ? "bg-gold/10 text-gold" : "text-text hover:bg-bg",
                  )}
                >
                  <span className="w-4 text-center text-text-muted">{item.icon}</span>
                  <span className="hidden flex-1 sm:inline">{item.label}</span>
                  {item.dot && <span className="h-2 w-2 rounded-full bg-gold" />}
                  {item.badge && (
                    <span className="rounded-full bg-sidebar px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
          <AssistantSettingsMenu />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[#faf9f7]">
          {view === "briefing" && (
            <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8">
              <div className="mx-auto max-w-3xl">
                <BriefingContent
                  firmId={firm.id}
                  compact
                  onAsk={(q) => {
                    setBriefingUnread(false);
                    void sendMessage(q, { fresh: true });
                  }}
                  onNavigate={() => !expanded && closeAssistant()}
                />
              </div>
            </div>
          )}

          {view === "automations" && (
            <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8">
              <AutomationsQuickView onNavigate={() => go("/automations")} onCountChange={setPendingApprovals} />
            </div>
          )}

          {view === "chat" && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
                {messages.length === 0 && (
                  <div className="mx-auto flex max-w-2xl flex-col pt-4">
                    <h2 className="text-center text-xl font-bold text-text lg:text-2xl">How can I help with capture today?</h2>
                    <p className="mx-auto mt-2 max-w-lg text-center text-sm text-text-muted">
                      Context-aware intelligence for {firm.legalName}. I remember your workflows and decisions, and every
                      opportunity I mention is clickable.
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {ASSISTANT_PROMPTS.slice(0, 4).map((card) => (
                        <button
                          key={card.title}
                          type="button"
                          onClick={() => void sendMessage(card.prompt)}
                          className="rounded-2xl border border-border bg-bg-surface p-4 text-left shadow-sm transition hover:border-gold/35 hover:shadow-md"
                        >
                          <p className="text-sm font-semibold text-text">{card.title}</p>
                          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-text-muted">{card.prompt}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mx-auto max-w-3xl space-y-5">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[92%] rounded-2xl px-4 py-3 md:max-w-[85%]",
                          msg.role === "user" ? "bg-sidebar text-white shadow-sm" : "border border-border/80 bg-bg-surface shadow-sm",
                        )}
                      >
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                        ) : (
                          <ChatMessageContent
                            content={msg.content}
                            role="assistant"
                            onAnalyzeInChat={(id, title) => setInlineAnalysis({ id, title })}
                          />
                        )}
                        {msg.note && <p className="mt-2 border-t border-border/60 pt-1.5 text-[10px] text-text-muted">{msg.note}</p>}
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

                  {error && <p className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>}
                </div>
              </div>

              <footer className="border-t border-border bg-bg-surface/80 px-4 py-3 backdrop-blur">
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
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm shadow-inner focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/15"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="rounded-2xl bg-gold px-5 py-2.5 text-sm font-semibold text-sidebar shadow-sm transition hover:bg-gold/90 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
                <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-text-muted">
                  {firm.assistantName} can make mistakes. Verify important capture decisions.
                </p>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
