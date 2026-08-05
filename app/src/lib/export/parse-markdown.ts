/**
 * Shared inline-markdown parser for DFEAL document generation.
 * Converts markdown text into a list of styled segments that
 * PDF and DOCX renderers can consume without raw markdown artifacts.
 */

export interface MarkdownSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

/**
 * Parse inline markdown formatting within a single block of text.
 * Supports: **bold**, *italic*, ___bold-italic___ (rare), [link](url).
 * Returns an array of segments that a renderer can iterate over
 * to apply proper styling.
 */
export function parseInlineMarkdown(raw: string): MarkdownSegment[] {
  if (!raw) return [];

  const segments: MarkdownSegment[] = [];

  // Step 1 — strip markdown links, keep the link text
  const text = raw.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Step 2 — tokenize bold + italic spans
  // Order matters: bold first so we don't split `*` inside `**`
  const BOLD_ITALIC_RE = /(\*\*\*|___)(.+?)\1/g;
  const BOLD_RE = /(\*\*|__)(.+?)\1/g;
  const ITALIC_RE = /(\*|_)(.+?)\1/g;

  // We'll work with a simple token stream:
  // { start, end, bold, italic }
  interface Span {
    start: number;
    end: number;
    bold: boolean;
    italic: boolean;
  }

  const spans: Span[] = [];

  // Helper: insert spans, avoiding overlap
  function addSpan(re: RegExp, bold: boolean, italic: boolean) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const inner = m[2];
      const start = m.index + m[1].length;
      const end = start + inner.length;
      // Check no existing span overlaps
      const overlaps = spans.some((s) => s.start < end && s.end > start);
      if (!overlaps) {
        spans.push({ start, end, bold, italic });
      }
    }
  }

  addSpan(BOLD_ITALIC_RE, true, true);
  addSpan(BOLD_RE, true, false);
  addSpan(ITALIC_RE, false, true);

  // Sort by start position
  spans.sort((a, b) => a.start - b.start);

  // Step 3 — build segments from spans
  let pos = 0;
  for (const span of spans) {
    // Plain text before this span
    if (pos < span.start) {
      const plain = text.slice(pos, span.start);
      if (plain) segments.push({ text: plain, bold: false, italic: false });
    }
    // The formatted span
    const formatted = text.slice(span.start, span.end);
    if (formatted) {
      segments.push({ text: formatted, bold: span.bold, italic: span.italic });
    }
    pos = span.end;
  }
  // Remaining plain text
  if (pos < text.length) {
    segments.push({ text: text.slice(pos), bold: false, italic: false });
  }

  // If no formatting was found, return the whole text as-is
  if (segments.length === 0) {
    segments.push({ text, bold: false, italic: false });
  }

  return segments;
}