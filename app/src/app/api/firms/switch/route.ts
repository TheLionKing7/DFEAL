import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_FIRM_COOKIE, getSessionUser } from "@/lib/firms/context";
import { getFirmById, listMembershipsForEmail } from "@/lib/firms/repository";
import { badRequest, readJson } from "@/lib/http/json";

/** Switch the active firm (members of several firms, or platform admins). */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson<{ firm_id?: string }>(request);
  if (!body?.firm_id) return badRequest("firm_id required");

  const allowed =
    user.isPlatformAdmin ||
    (await listMembershipsForEmail(user.email)).some((m) => m.firmId === body.firm_id);
  if (!allowed || !(await getFirmById(body.firm_id))) {
    return NextResponse.json({ error: "Firm not available" }, { status: 403 });
  }

  (await cookies()).set(ACTIVE_FIRM_COOKIE, body.firm_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true });
}
