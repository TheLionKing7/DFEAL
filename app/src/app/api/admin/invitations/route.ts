import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";
import { createInvitation, listInvitations, resendInvitation, revokeInvitation } from "@/lib/onboarding/invitations";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  companyName: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

export async function GET() {
  const admin = await requirePlatformAdminApi();
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json({ invitations: await listInvitations() });
  } catch (error) {
    return serverError("api.invitations.list_failed", error);
  }
}

/** Invite a business to onboard (or `{ action: "resend", id }`). */
export async function POST(request: NextRequest) {
  const admin = await requirePlatformAdminApi();
  if (admin instanceof NextResponse) return admin;
  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badRequest("Invalid JSON body");

  try {
    if (body.action === "resend" && typeof body.id === "string") {
      return NextResponse.json({ ok: true, ...(await resendInvitation(body.id)) });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
    const result = await createInvitation({ ...parsed.data, invitedBy: admin.email });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return serverError("api.invitations.create_failed", error, error instanceof Error ? error.message : "Invite failed");
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePlatformAdminApi();
  if (admin instanceof NextResponse) return admin;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");
  try {
    await revokeInvitation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.invitations.revoke_failed", error);
  }
}
