import { isMongoConfigured } from "@/lib/mongodb/client";
import { saveEngagement } from "@/lib/mongodb/repositories/engagements";
import { saveSourceDocument } from "@/lib/mongodb/repositories/source-documents";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";

export async function persistUploadedFile(
  clientName: string,
  file: { name: string; type: string; buffer: Buffer }
): Promise<void> {
  if (!isMongoConfigured() || !clientName.trim()) return;
  await saveSourceDocument({
    clientName: clientName.trim(),
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    data: file.buffer,
    kind: "trial_balance",
  });
}

export async function persistEngagementAnalysis(
  analysis: AdvisoryAnalysisOutput
): Promise<void> {
  if (!isMongoConfigured()) return;
  const clientName = analysis.engagement?.client_name?.trim();
  if (!clientName) return;
  await saveEngagement(clientName, analysis);
}
