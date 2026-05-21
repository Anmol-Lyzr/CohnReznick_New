import { ObjectId, type WithId } from "mongodb";
import { getDb, isMongoConfigured } from "@/lib/mongodb/client";
import type { SourceDocumentMeta, SourceDocumentRecord } from "@/lib/mongodb/types";

const COLLECTION = "source_documents";

function toMeta(doc: WithId<SourceDocumentRecord>): SourceDocumentMeta {
  return {
    id: doc._id.toHexString(),
    clientName: doc.clientName,
    filename: doc.filename,
    contentType: doc.contentType,
    size: doc.size,
    kind: doc.kind,
    uploadedAt: doc.uploadedAt.toISOString(),
  };
}

export async function saveSourceDocument(args: {
  clientName: string;
  filename: string;
  contentType: string;
  data: Buffer;
  kind?: SourceDocumentRecord["kind"];
}): Promise<SourceDocumentMeta> {
  const db = await getDb();
  const col = db.collection<SourceDocumentRecord>(COLLECTION);
  const now = new Date();
  const kind = args.kind ?? "trial_balance";

  const existing = await col.findOne({
    clientName: args.clientName,
    filename: args.filename,
  });

  if (existing?._id) {
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          contentType: args.contentType,
          size: args.data.length,
          data: args.data,
          kind,
          uploadedAt: now,
        },
      }
    );
    const updated = await col.findOne({ _id: existing._id });
    if (!updated) throw new Error("Failed to read updated document");
    return toMeta(updated);
  }

  const insert: SourceDocumentRecord = {
    clientName: args.clientName,
    filename: args.filename,
    contentType: args.contentType || "application/octet-stream",
    size: args.data.length,
    data: args.data,
    kind,
    uploadedAt: now,
  };
  const result = await col.insertOne(insert);
  const doc = await col.findOne({ _id: result.insertedId });
  if (!doc) throw new Error("Failed to read inserted document");
  return toMeta(doc);
}

export async function listSourceDocuments(clientName: string): Promise<SourceDocumentMeta[]> {
  const db = await getDb();
  const docs = await db
    .collection<SourceDocumentRecord>(COLLECTION)
    .find({ clientName })
    .sort({ uploadedAt: -1 })
    .toArray();
  return docs.map(toMeta);
}

export async function getSourceDocumentById(id: string): Promise<WithId<SourceDocumentRecord> | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  return db.collection<SourceDocumentRecord>(COLLECTION).findOne({ _id: new ObjectId(id) });
}

export async function getSourceDocumentByName(
  clientName: string,
  filename: string
): Promise<WithId<SourceDocumentRecord> | null> {
  const db = await getDb();
  return db.collection<SourceDocumentRecord>(COLLECTION).findOne({ clientName, filename });
}

export function collectFilenamesFromAnalysis(
  analysis: { issue_log?: { source_refs?: string[] }[] } | null,
  extra: string[] = []
): string[] {
  const names = new Set<string>(extra.filter(Boolean));
  for (const issue of analysis?.issue_log ?? []) {
    for (const ref of issue.source_refs ?? []) {
      const trimmed = ref.trim();
      if (/\.(xlsx|xls|csv|pdf|md|docx?)$/i.test(trimmed)) {
        names.add(trimmed.split(/[/\\]/).pop() || trimmed);
      } else if (trimmed.includes(".xlsx") || trimmed.includes(".csv")) {
        const match = trimmed.match(/[\w.-]+\.(xlsx|xls|csv|pdf)/i);
        if (match) names.add(match[0]);
      }
    }
  }
  return [...names];
}

export async function ensureMongoReady(): Promise<boolean> {
  return isMongoConfigured();
}
