import { NextRequest, NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { getSourceDocumentByName } from "@/lib/mongodb/repositories/source-documents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientName = req.nextUrl.searchParams.get("client")?.trim();
  const filename = req.nextUrl.searchParams.get("name")?.trim();

  if (!clientName || !filename) {
    return NextResponse.json({ error: "client and name query required" }, { status: 400 });
  }
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }

  try {
    const doc = await getSourceDocumentByName(clientName, filename);
    if (!doc?._id) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: doc._id.toHexString(),
      filename: doc.filename,
      clientName: doc.clientName,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
