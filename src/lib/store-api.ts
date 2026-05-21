import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import type { EngagementAnalysisStore } from "@/lib/advisory-store";
import type { SourceDocumentMeta } from "@/lib/mongodb/types";

export interface EngagementApiRow {
  clientName: string;
  analysis: AdvisoryAnalysisOutput | null;
  sourceDocuments: SourceDocumentMeta[];
  sourceDocFilenames: string[];
}

export async function fetchEngagementStore(): Promise<{
  configured: boolean;
  store: EngagementAnalysisStore;
  sourceDocsByClient: Record<string, string[]>;
}> {
  try {
    const res = await fetch("/api/store/engagements");
    const data = (await res.json()) as {
      configured?: boolean;
      engagements?: EngagementApiRow[];
    };
    if (!res.ok) {
      return { configured: res.status !== 503, store: {}, sourceDocsByClient: {} };
    }
    if (!data.engagements) {
      return { configured: Boolean(data.configured), store: {}, sourceDocsByClient: {} };
    }
    const store: EngagementAnalysisStore = {};
    const sourceDocsByClient: Record<string, string[]> = {};
    for (const row of data.engagements) {
      if (row.analysis) store[row.clientName] = row.analysis;
      sourceDocsByClient[row.clientName] =
        row.sourceDocFilenames ??
        row.sourceDocuments?.map((d) => d.filename) ??
        [];
    }
    return { configured: Boolean(data.configured), store, sourceDocsByClient };
  } catch {
    return { configured: false, store: {}, sourceDocsByClient: {} };
  }
}

export async function saveEngagementToStore(
  clientName: string,
  analysis: AdvisoryAnalysisOutput
): Promise<void> {
  await fetch(`/api/store/engagements/${encodeURIComponent(clientName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis }),
  });
}
