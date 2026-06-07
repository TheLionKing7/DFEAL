import { NextRequest, NextResponse } from "next/server";
import { lookupSamEntity } from "@/lib/sam-gov/entity";

export async function GET(request: NextRequest) {
  try {
    const uei = request.nextUrl.searchParams.get("uei") ?? undefined;
    const cage = request.nextUrl.searchParams.get("cage") ?? undefined;

    if (!uei && !cage) {
      return NextResponse.json(
        { error: "Query param uei or cage is required" },
        { status: 400 },
      );
    }

    const entity = await lookupSamEntity({ uei, cage });
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    return NextResponse.json({ entity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Entity lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
