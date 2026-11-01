import { NextRequest } from "next/server";
import { generateDocumentHandler } from "@/app/api/documents/route";

export const maxDuration = 120;

/** Alias of POST /api/documents (kept for existing clients). */
export async function POST(request: NextRequest) {
  return generateDocumentHandler(request);
}
