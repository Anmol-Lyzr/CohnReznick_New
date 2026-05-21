import type { ObjectId } from "mongodb";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";

export interface SourceDocumentRecord {
  _id?: ObjectId;
  clientName: string;
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
  kind: "trial_balance" | "advisory" | "other";
  uploadedAt: Date;
}

export interface SourceDocumentMeta {
  id: string;
  clientName: string;
  filename: string;
  contentType: string;
  size: number;
  kind: SourceDocumentRecord["kind"];
  uploadedAt: string;
}

export interface EngagementRecord {
  _id?: ObjectId;
  clientName: string;
  analysis: AdvisoryAnalysisOutput | null;
  sourceDocuments: SourceDocumentMeta[];
  updatedAt: Date;
}

export interface EngagementStorePayload {
  clientName: string;
  analysis: AdvisoryAnalysisOutput | null;
  sourceDocuments: SourceDocumentMeta[];
  updatedAt: string;
}
