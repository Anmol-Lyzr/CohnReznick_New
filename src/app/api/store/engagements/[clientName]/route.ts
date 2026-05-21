import { NextRequest, NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import {
  getEngagement,
  getSourceDocFilenames,
  saveEngagement,
} from "@/lib/mongodb/repositories/engagements";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import { isAdvisoryAnalysisOutput } from "@/lib/parse-advisory-output";

export const dynamic = "force-dynamic";

function decodeClientName(raw: string): string {
  return decodeURIComponent(raw);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientName: string }> }
) {
  const { clientName: raw } = await params;
  const clientName = decodeClientName(raw);

  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }

  try {
    const engagement = await getEngagement(clientName);
    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...engagement,
      sourceDocFilenames: getSourceDocFilenames(engagement),
    });
  } catch (err) {
    console.error("[store/engagements/[client]] GET:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientName: string }> }
) {
  const { clientName: raw } = await params;
  const clientName = decodeClientName(raw);

  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }

  try {
    const body = (await req.json()) as { analysis?: unknown };
    if (!isAdvisoryAnalysisOutput(body.analysis)) {
      return NextResponse.json({ error: "Invalid advisory_analysis_output" }, { status: 400 });
    }
    const analysis = body.analysis as AdvisoryAnalysisOutput;
    if (analysis.engagement.client_name !== clientName) {
      analysis.engagement = { ...analysis.engagement, client_name: clientName };
    }
    const saved = await saveEngagement(clientName, analysis);
    return NextResponse.json({
      ...saved,
      sourceDocFilenames: getSourceDocFilenames(saved),
    });
  } catch (err) {
    console.error("[store/engagements/[client]] PUT:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
