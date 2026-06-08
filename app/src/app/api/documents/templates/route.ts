import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import { loadDocumentTemplate } from "@/lib/documents/template-loader";
import { DOCUMENT_TYPES, type DocumentType } from "@/shared/document-types";

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type") as DocumentType | null;

  if (type) {
    if (!DOCUMENT_TYPES.some((d) => d.id === type)) {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }
    const outline = loadDocumentTemplate(type);
    return NextResponse.json({ type, outline });
  }

  return NextResponse.json({
    templates: DOCUMENT_TYPES.map((d) => ({
      id: d.id,
      label: d.label,
      description: d.description,
    })),
  });
}
