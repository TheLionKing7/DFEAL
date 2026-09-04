/**
 * Markdown cleanup utilities for DFEAL document generation.
 *
 * Pure string transforms with no external dependencies, so they are safe
 * to use on both the server (before saving / rendering) and the client
 * (for on-screen previews and clipboard copies). The goal is that no
 * markdown jargon (`#`, `**`, `|`, `---`, `>`, backticks) ever reaches
 * what a user actually reads.
 */

/** Strip inline markdown markers, keeping the text content. */
export function stripInlineMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images -> alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/`([^`]*)`/g, "$1") // inline code -> text
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1") // bold-italic
    .replace(/___([^_]+)___/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/~~([^~]+)~~/g, "$1"); // strikethrough
}

/** Remove a heading's leading markdown marker and inline formatting. */
export function cleanHeadingText(raw: string): string {
  return stripInlineMarkdown(raw)
    .replace(/^\s*#{1,6}\s+/, "") // leading # / ## / ### ...
    .replace(/^\s*>\s?/, "") // blockquote marker
    .trim();
}

/**
 * Normalize an LLM-produced markdown document by removing the block-level
 * artifacts that leak into exported PDF/DOCX output:
 *   - code fences (```) and their contents
 *   - horizontal rules (---, ***, ___)
 *   - setext heading underlines (=== / ---)
 *   - blockquote `>` markers
 *
 * Keeps the structure the renderers rely on: `#`/`##`/`###` headings,
 * `-` bullets, `1.` numbered lists, pipe tables, and plain paragraphs.
 */
export function sanitizeMarkdownOutput(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let inFence = false;

  for (const raw of lines) {
    const line = raw;

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue; // drop code-fence contents entirely

    // Horizontal rules (---, ***, ___)
    if (/^\s*([-*_]\s*){3,}$/.test(line)) continue;

    // Setext heading underlines (=== or --- under a heading line)
    if (/^\s*={3,}\s*$/.test(line) || /^\s*-{3,}\s*$/.test(line)) continue;

    // Blockquote marker
    out.push(line.replace(/^\s*>\s?/, ""));
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Convert a markdown document into clean, human-readable plain text.
 * Used for on-screen previews and clipboard copies so no markdown jargon
 * (`#`, `**`, `|`, `---`) leaks into what a user reads.
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let inFence = false;

  const pushBlank = () => {
    if (out.length && out[out.length - 1] !== "") out.push("");
  };

  for (const raw of lines) {
    let line = raw;

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Skip horizontal rules / dividers
    if (/^\s*([-*_]\s*){3,}$/.test(trimmed)) continue;

    // Skip setext heading underlines
    if (/^\s*={3,}\s*$/.test(trimmed) || /^\s*-{3,}\s*$/.test(trimmed)) continue;

    // Blockquotes -> plain text
    line = line.replace(/^\s*>\s?/, "");

    // Headings -> plain text line
    if (/^\s*#{1,6}\s+/.test(line)) {
      pushBlank();
      out.push(cleanHeadingText(line));
      out.push("");
      continue;
    }

    // Table rows -> compact, readable "cell · cell" text
    if (line.trim().startsWith("|")) {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cells.length === 0 || cells.every((c) => /^[-:]+$/.test(c))) continue;
      out.push(cells.map(stripInlineMarkdown).join("  ·  "));
      continue;
    }

    // Bullets -> "• item"
    if (/^\s*[-*+]\s+/.test(line)) {
      out.push("• " + stripInlineMarkdown(line.replace(/^\s*[-*+]\s+/, "")));
      continue;
    }

    // Numbered lists -> keep as "1. item"
    if (/^\s*\d+[.)]\s+/.test(line)) {
      out.push(stripInlineMarkdown(line.trim()));
      continue;
    }

    // Normal paragraph
    const cleaned = stripInlineMarkdown(line.trimEnd());
    if (cleaned.trim()) {
      out.push(cleaned);
    } else {
      pushBlank();
    }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
