import { NextRequest, NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { getSourceDocumentById } from "@/lib/mongodb/repositories/source-documents";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const download = req.nextUrl.searchParams.get("download") === "1";

  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }

  try {
    const doc = await getSourceDocumentById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (download) {
      return new NextResponse(new Uint8Array(doc.data), {
        headers: {
          "Content-Type": doc.contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.filename)}"`,
          "Content-Length": String(doc.size),
        },
      });
    }

    const isText =
      doc.contentType.startsWith("text/") ||
      doc.filename.endsWith(".md") ||
      doc.filename.endsWith(".csv");

    if (isText) {
      return NextResponse.json({
        id: doc._id!.toHexString(),
        filename: doc.filename,
        clientName: doc.clientName,
        contentType: doc.contentType,
        content: doc.data.toString("utf8"),
        preview: "text",
      });
    }

    return NextResponse.json({
      id: doc._id!.toHexString(),
      filename: doc.filename,
      clientName: doc.clientName,
      contentType: doc.contentType,
      size: doc.size,
      preview: "binary",
      message:
        "Binary file stored in MongoDB. Use ?download=1 to download the original file.",
      downloadUrl: `/api/store/documents/${id}?download=1`,
    });
  } catch (err) {
    console.error("[store/documents/[id]] GET:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
