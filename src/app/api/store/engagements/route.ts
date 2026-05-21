import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { listEngagements } from "@/lib/mongodb/repositories/engagements";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "MongoDB not configured", configured: false, engagements: [] },
      { status: 503 }
    );
  }
  try {
    const engagements = await listEngagements();
    return NextResponse.json({ configured: true, engagements });
  } catch (err) {
    console.error("[store/engagements] GET failed:", err);
    return NextResponse.json(
      { error: (err as Error).message, configured: true, engagements: [] },
      { status: 500 }
    );
  }
}
