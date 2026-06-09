/**
 * Light cleanup of LLM markdown habits before display.
 * Preserves [[opp:id|title]] tokens.
 */
export function preprocessAssistantContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^\+ /gm, "• ")
    .replace(/^-\s+/gm, "• ")
    .replace(/^\*\s+/gm, "• ")
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<![*\w])\*(?![*\w])/g, "")
    .trim();
}
