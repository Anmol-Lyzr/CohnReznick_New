import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import { getDb } from "@/lib/mongodb/client";
import type { EngagementRecord, EngagementStorePayload } from "@/lib/mongodb/types";
import { collectFilenamesFromAnalysis, listSourceDocuments } from "@/lib/mongodb/repositories/source-documents";
import type { SourceDocumentMeta } from "@/lib/mongodb/types";

const COLLECTION = "engagements";

function toPayload(doc: EngagementRecord & { _id?: unknown }): EngagementStorePayload {
  return {
    clientName: doc.clientName,
    analysis: doc.analysis,
    sourceDocuments: doc.sourceDocuments ?? [],
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function syncSourceDocumentMeta(
  clientName: string,
  analysis: AdvisoryAnalysisOutput | null
): Promise<SourceDocumentMeta[]> {
  const stored = await listSourceDocuments(clientName);
  const fromRefs = collectFilenamesFromAnalysis(analysis);
  const filenames = new Set([
    ...stored.map((d) => d.filename),
    ...fromRefs,
  ]);
  return stored.filter((d) => filenames.has(d.filename));
}

export async function saveEngagement(
  clientName: string,
  analysis: AdvisoryAnalysisOutput
): Promise<EngagementStorePayload> {
  const db = await getDb();
  const col = db.collection<EngagementRecord>(COLLECTION);
  const sourceDocuments = await syncSourceDocumentMeta(clientName, analysis);
  const now = new Date();
  const record: EngagementRecord = {
    clientName,
    analysis,
    sourceDocuments,
    updatedAt: now,
  };

  await col.updateOne({ clientName }, { $set: record }, { upsert: true });
  return toPayload(record);
}

export async function getEngagement(clientName: string): Promise<EngagementStorePayload | null> {
  const db = await getDb();
  const doc = await db.collection<EngagementRecord>(COLLECTION).findOne({ clientName });
  if (!doc) return null;
  const sourceDocuments = await syncSourceDocumentMeta(clientName, doc.analysis);
  return toPayload({ ...doc, sourceDocuments });
}

export async function listEngagements(): Promise<EngagementStorePayload[]> {
  const db = await getDb();
  const docs = await db.collection<EngagementRecord>(COLLECTION).find().sort({ updatedAt: -1 }).toArray();
  const out: EngagementStorePayload[] = [];
  for (const doc of docs) {
    const sourceDocuments = await syncSourceDocumentMeta(doc.clientName, doc.analysis);
    out.push(toPayload({ ...doc, sourceDocuments }));
  }
  return out;
}

export async function loadEngagementStoreFromMongo(): Promise<
  Record<string, AdvisoryAnalysisOutput>
> {
  const rows = await listEngagements();
  const store: Record<string, AdvisoryAnalysisOutput> = {};
  for (const row of rows) {
    if (row.analysis) store[row.clientName] = row.analysis;
  }
  return store;
}

export function getSourceDocFilenames(payload: EngagementStorePayload): string[] {
  const fromMeta = payload.sourceDocuments.map((d) => d.filename);
  const fromAnalysis = collectFilenamesFromAnalysis(payload.analysis);
  return [...new Set([...fromMeta, ...fromAnalysis])];
}
