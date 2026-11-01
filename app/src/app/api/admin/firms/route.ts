import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/firms/context";
import { listFirms } from "@/lib/firms/repository";
import { serverError } from "@/lib/http/json";

export async function GET() {
  const admin = await requirePlatformAdminApi();
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json({ firms: await listFirms() });
  } catch (error) {
    return serverError("api.admin.firms_failed", error);
  }
}
