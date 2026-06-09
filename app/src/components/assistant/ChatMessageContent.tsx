"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { InlineAnalysisPanel } from "@/components/assistant/InlineAnalysisPanel";
import { preprocessAssistantContent } from "@/lib/assistant/format-message";
import { useOpportunityLists } from "@/hooks/useOpportunityLists";
import { cn } from "@/shared/cn";

const OPP_TOKEN = /\[\[opp:([^|\]]+)\|([^\]]+)\]\]/g;
const LIST_LINE = /^(?:•|[\d]+[.)])\s+/;

interface OpportunityChipProps {
  id: string;
  title: string;
  compact?: boolean;
  onAnalyzeInChat?: (id: string, title: string) => void;
}

export function OpportunityChip({
  id,
  title,
  compact = false,
  onAnalyzeInChat,
}: OpportunityChipProps) {
  const { toggleList, createPursuit, isTracked, isFavorite } = useOpportunityLists();
  const [hover, setHover] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [busy, setBusy] = useState(false);

  async function runAction(action: "pursuit" | "track" | "favorite" | "analyze") {
    setBusy(true);
    try {
      if (action === "pursuit") await createPursuit(id);
      if (action === "track") await toggleList(id, "track");
      if (action === "favorite") await toggleList(id, "favorite");
      if (action === "analyze") {
        if (onAnalyzeInChat) onAnalyzeInChat(id, title);
        setShowAnalysis(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="my-1 inline-block max-w-full align-middle">
      <span
        className="relative inline-block max-w-full"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <Link
          href={`/opportunities/${id}`}
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/[0.06] px-2.5 py-1 text-sm font-medium text-sidebar transition hover:border-gold/50 hover:bg-gold/10",
            compact && "text-xs",
          )}
        >
          <span className="text-gold">◆</span>
          <span className="truncate">{title}</span>
        </Link>

        {hover && (
          <span className="absolute left-0 top-full z-20 mt-1 flex min-w-[12rem] flex-col overflow-hidden rounded-lg border border-border bg-bg-surface shadow-lg">
            {(
              [
                ["pursuit", "Create pursuit"],
                ["track", isTracked(id) ? "Untrack" : "Track"],
                ["favorite", isFavorite(id) ? "Unfavorite" : "Add to favourite"],
                ["analyze", "Analyze"],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                type="button"
                disabled={busy}
                onClick={() => void runAction(action)}
                className="px-3 py-2 text-left text-xs text-text hover:bg-gold/[0.08] disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </span>
        )}
      </span>

      {showAnalysis && (
        <InlineAnalysisPanel
          opportunityId={id}
          title={title}
          onClose={() => setShowAnalysis(false)}
        />
      )}
    </span>
  );
}

/** Inline **bold**, *italic*, `code` — strips visible markdown markers. */
function renderInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let key = 0;
  let cursor = 0;
  const inline = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`/g;
  let match: RegExpExecArray | null;

  while ((match = inline.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(
        <span key={`${keyPrefix}-p-${key++}`}>{text.slice(cursor, match.index)}</span>,
      );
    }
    if (match[1]) {
      parts.push(
        <strong key={`${keyPrefix}-b-${key++}`} className="font-semibold text-text">
          {match[1]}
        </strong>,
      );
    } else if (match[2]) {
      parts.push(
        <em key={`${keyPrefix}-i-${key++}`} className="text-text/90">
          {match[2]}
        </em>,
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={`${keyPrefix}-c-${key++}`}
          className="rounded bg-sidebar/5 px-1 py-0.5 font-mono text-[0.85em] text-sidebar"
        >
          {match[3]}
        </code>,
      );
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push(<span key={`${keyPrefix}-p-${key}`}>{text.slice(cursor)}</span>);
  }

  return parts;
}

function renderRichText(
  text: string,
  keyPrefix: string,
  onAnalyze?: OpportunityChipProps["onAnalyzeInChat"],
): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const re = new RegExp(OPP_TOKEN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        ...renderInlineFormatting(
          text.slice(lastIndex, match.index),
          `${keyPrefix}-in-${key++}`,
        ),
      );
    }
    parts.push(
      <OpportunityChip
        key={`${keyPrefix}-o-${key++}`}
        id={match[1]}
        title={match[2]}
        onAnalyzeInChat={onAnalyze}
      />,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      ...renderInlineFormatting(text.slice(lastIndex), `${keyPrefix}-in-${key}`),
    );
  }

  return parts;
}

function stripListPrefix(line: string): string {
  return line.replace(/^(?:•|[\d]+[.)])\s+/, "").trim();
}

function isListBlock(block: string): boolean {
  const lines = block.split("\n").filter((l) => l.trim());
  return lines.length > 0 && lines.every((l) => LIST_LINE.test(l.trim()));
}

function isNumberedList(block: string): boolean {
  const lines = block.split("\n").filter((l) => l.trim());
  return lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));
}

export function ChatMessageContent({
  content,
  role,
  onAnalyzeInChat,
}: {
  content: string;
  role: "user" | "assistant";
  onAnalyzeInChat?: (id: string, title: string) => void;
}) {
  const normalized =
    role === "assistant" ? preprocessAssistantContent(content) : content;
  const blocks = normalized.split(/\n\n+/);

  return (
    <div className={cn("space-y-3 text-[0.9375rem] leading-[1.65]", role === "assistant" && "text-text")}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (isListBlock(trimmed)) {
          const lines = trimmed.split("\n").filter((l) => l.trim());
          const ordered = isNumberedList(trimmed);

          if (ordered) {
            return (
              <ol key={i} className="list-decimal space-y-2 pl-5">
                {lines.map((line, j) => (
                  <li key={j} className="pl-1">
                    {renderRichText(stripListPrefix(line.trim()), `ol${i}-${j}`, onAnalyzeInChat)}
                  </li>
                ))}
              </ol>
            );
          }

          return (
            <ul key={i} className="space-y-2">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/80" aria-hidden />
                  <span className="min-w-0 flex-1">
                    {renderRichText(stripListPrefix(line.trim()), `ul${i}-${j}`, onAnalyzeInChat)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (trimmed.includes("\n")) {
          return (
            <div key={i} className="space-y-2">
              {trimmed.split("\n").map((line, j) => {
                const lineTrim = line.trim();
                if (!lineTrim) return null;
                if (LIST_LINE.test(lineTrim)) {
                  return (
                    <div key={j} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/80" aria-hidden />
                      <span className="min-w-0 flex-1">
                        {renderRichText(stripListPrefix(lineTrim), `mix${i}-${j}`, onAnalyzeInChat)}
                      </span>
                    </div>
                  );
                }
                return (
                  <p key={j}>
                    {renderRichText(lineTrim, `ln${i}-${j}`, onAnalyzeInChat)}
                  </p>
                );
              })}
            </div>
          );
        }

        return (
          <p key={i}>
            {renderRichText(trimmed, `p${i}`, onAnalyzeInChat)}
          </p>
        );
      })}
    </div>
  );
}
