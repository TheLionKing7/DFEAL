import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/firms/context";
import { getFirmById, setFirmStatus } from "@/lib/firms/repository";
import { badRequest, notFound, readJson, serverError } from "@/lib/http/json";
import { logger } from "@/lib/logger";

/** Suspend / reactivate a firm. Suspended firms are excluded from ingest scoring and sign-in. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePlatformAdminApi();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await readJson<{ status?: string }>(request);
  if (body?.status !== "active" && body?.status !== "suspended") {
    return badRequest("status must be active or suspended");
  }

  try {
    if (!(await getFirmById(id))) return notFound("Firm not found");
    await setFirmStatus(id, body.status);
    logger.info("firm.status_changed", { firmId: id, status: body.status, by: admin.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.admin.firm_status_failed", error);
  }
}
