"use client";

import { useCallback, useEffect, useState } from "react";
import { useAssistant } from "@/components/assistant/AssistantContext";
import { usePageContext } from "@/components/assistant/PageContextProvider";
import { TENANT } from "@/config/platform";
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userName] = useState(() => "there");

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
  }, []);

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
        void loadSessions();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pageContext, sessionId, loadSessions],
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

  const filteredSessions = sessions.filter((s) =>
    (s.title ?? "Chat").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-bg">
      {/* Chat history rail — GovTribe-style */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-bg-surface md:flex lg:w-64">
        <div className="space-y-1 border-b border-border p-3">
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center gap-2 rounded-lg bg-sidebar px-3 py-2 text-left text-sm font-medium text-white hover:bg-sidebar-surface"
          >
            <span>＋</span> New chat
          </button>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() =>
              void sendMessage(
                "Give me today's capture briefing: top hot opportunities, deadlines this week, and recommended pursuits for DFEAL.",
              )
            }
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-text-muted hover:bg-bg"
          >
            <span className="h-2 w-2 rounded-full bg-gold" />
            Daily briefing
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Recent chats
          </p>
          <ul className="mt-1 space-y-0.5">
            {filteredSessions.length === 0 && (
              <li className="px-2 py-2 text-xs text-text-muted">No chats yet</li>
            )}
            {filteredSessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => void loadSession(s.id)}
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left text-xs leading-snug",
                    sessionId === s.id
                      ? "bg-gold/10 font-medium text-gold"
                      : "text-text-muted hover:bg-bg",
                  )}
                >
                  <span className="line-clamp-2">{s.title ?? "Untitled chat"}</span>
                  <span className="mt-0.5 block text-[10px] opacity-70">
                    {new Date(s.updated_at).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-text">{TENANT.assistantName}</h1>
            <p className="text-xs text-text-muted">
              Strategic capture intelligence for {TENANT.legalName}
            </p>
          </div>
          {fullPage && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-3 py-1.5 text-xs text-text-muted hover:bg-bg"
            >
              Close
            </button>
          )}
        </div>

        {pageContext.page !== "unknown" && (
          <div className="border-b border-border bg-gold/[0.06] px-4 py-2 text-xs text-text-muted">
            <span className="font-semibold uppercase text-gold">Context</span>
            <span className="mx-2">·</span>
            {pageContext.summary ?? pageContext.label}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-8">
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-2xl flex-col items-center pt-8 text-center lg:pt-16">
              <h2 className="text-2xl font-bold text-text lg:text-3xl">
                Hi {userName}, how can I help today?
              </h2>
              <p className="mt-2 max-w-lg text-sm text-text-muted">
                I&apos;m your personal capture strategist — I find opportunities, design pursuit
                plans, and help every bid move with strategic intelligence and speed.
              </p>

              <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                {ASSISTANT_PROMPTS.map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => void sendMessage(card.prompt)}
                    className="rounded-xl border border-border bg-bg-surface p-4 text-left transition hover:border-gold/40 hover:shadow-sm"
                  >
                    <p className="text-sm font-semibold text-text">{card.title}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-text-muted">{card.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "mx-auto max-w-3xl rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "ml-auto bg-sidebar text-white md:ml-[20%]"
                  : "border border-border bg-bg-surface text-text",
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          ))}

          {loading && messages.length > 0 && (
            <p className="text-center text-sm text-text-muted">Analyzing…</p>
          )}
          {error && (
            <p className="mx-auto max-w-3xl rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
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
            className="mx-auto flex max-w-3xl gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about opportunities, capture strategy, or proposals…"
              className="flex-1 rounded-xl border border-border bg-bg-surface px-4 py-3 text-sm shadow-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-sidebar px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
