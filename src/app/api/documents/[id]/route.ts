import { readFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { POC_DOCUMENT_API_ID } from "@/lib/source-documents";

const DOCUMENTS: Record<
  string,
  { filename: string; publicPath: string }
> = {
  [POC_DOCUMENT_API_ID]: {
    filename: "CohnReznick_Advisory_Agent_PoC.md",
    publicPath: "documents/CohnReznick_Advisory_Agent_PoC.md",
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meta = DOCUMENTS[id];
  if (!meta) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), "public", meta.publicPath);
    const content = readFileSync(filePath, "utf-8");
    return NextResponse.json({
      id,
      title: "CohnReznick_Advisory_Agent_PoC.pdf",
      filename: meta.filename,
      content,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
