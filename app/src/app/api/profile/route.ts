import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";
import { getUserProfile, profileInputSchema, upsertUserProfile } from "@/lib/onboarding/profile";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ email: user.email, profile: await getUserProfile(user.email) });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = profileInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  try {
    return NextResponse.json({ ok: true, profile: await upsertUserProfile(user.email, user.id, parsed.data) });
  } catch (error) {
    return serverError("api.profile.update_failed", error);
  }
}
