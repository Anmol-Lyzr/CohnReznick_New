import { NextRequest, NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import {
  listSourceDocuments,
  saveSourceDocument,
} from "@/lib/mongodb/repositories/source-documents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientName = req.nextUrl.searchParams.get("clientName")?.trim();
  if (!clientName) {
    return NextResponse.json({ error: "clientName query required" }, { status: 400 });
  }
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }
  try {
    const documents = await listSourceDocuments(clientName);
    return NextResponse.json({ clientName, documents });
  } catch (err) {
    console.error("[store/documents] GET:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const clientName = (formData.get("clientName") as string)?.trim();
    const file = formData.get("file") as File | null;
    if (!clientName || !file) {
      return NextResponse.json({ error: "clientName and file required" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await saveSourceDocument({
      clientName,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      data: buffer,
      kind: "trial_balance",
    });
    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error("[store/documents] POST:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
