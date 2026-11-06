/** Client-safe metadata for workspace reference documents. */
export const REFERENCE_DOC_TYPES = [
  { id: "capability_statement", label: "Capability statement" },
  { id: "past_proposal", label: "Past proposal / technical volume" },
  { id: "rfi_response", label: "RFI response" },
  { id: "sources_sought", label: "Sources-sought response" },
  { id: "past_performance", label: "Past performance / CPARS write-up" },
  { id: "resume", label: "Key personnel resume" },
  { id: "style_guide", label: "Style guide / boilerplate" },
  { id: "template", label: "Template" },
  { id: "other", label: "Other" },
] as const;

export type ReferenceDocType = (typeof REFERENCE_DOC_TYPES)[number]["id"];

export const REFERENCE_ACCEPT = ".pdf,.docx,.txt,.md";
export const REFERENCE_MAX_BYTES = 25 * 1024 * 1024;

export interface ReferenceDocument {
  id: string;
  title: string;
  doc_type: ReferenceDocType;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  char_count: number;
  use_for_drafting: boolean;
  notes: string | null;
  uploaded_by: string;
  created_at: string;
  excerpt: string;
}

export function referenceDocLabel(id: string): string {
  return REFERENCE_DOC_TYPES.find((t) => t.id === id)?.label ?? id;
}
