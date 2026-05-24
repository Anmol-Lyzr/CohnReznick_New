import type { ActivityEvent } from "@/hooks/use-journey-stream";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import { formatSkillMarkdown } from "@/lib/advisory-mappers";
import { SKILL_ACTIVITIES } from "@/lib/mock-outputs";
import { DEMO_ENGAGEMENT } from "@/lib/cohnreznick-metadata";
import { canLoadPoCSample } from "@/lib/client-sample-guard";
import { getAnalysisForEngagement } from "@/lib/engagement-analysis";
import { syncReportFromIssues } from "@/lib/analysis-mutations";

function makeActivities(skill: string): ActivityEvent[] {
  const now = Date.now();
  const base = (SKILL_ACTIVITIES[skill] || []).map((a, i) => ({
    action: a.action,
    icon: a.icon,
    filePath: a.filePath,
    ts: now + i * 800,
  }));
  return base;
}

export async function loadSampleOutput(
  skill: string,
  engagementName?: string
): Promise<{
  activities: ActivityEvent[];
  output: string;
  analysis: AdvisoryAnalysisOutput;
}> {
  const fileMap: Record<string, string> = {
    "trial-balance-ingestion": "trial-balance-summary.md",
    "anomaly-detection": "anomaly-findings.md",
    "driver-analysis": "driver-analysis.md",
    "follow-up-questions": "follow-up-questions.md",
    "issue-tracker": "issue-log.md",
    "report-drafting": "diligence-report-draft.md",
  };
  const fileName = fileMap[skill];
  const activities = makeActivities(skill);
  const sampleInputs = SAMPLE_INPUTS[skill] || { engagementName: DEMO_ENGAGEMENT.client };

  const name = (engagementName || (sampleInputs.engagementName as string) || DEMO_ENGAGEMENT.client) as string;
  if (!canLoadPoCSample(name)) {
    throw new Error("PoC sample data is only available for built-in engagements.");
  }
  const analysis = syncReportFromIssues(getAnalysisForEngagement(name));
  const formatted = formatSkillMarkdown(skill, analysis);

  if (!fileName) {
    return { activities, output: formatted, analysis };
  }

  try {
    const res = await fetch(`/api/agent/files?path=workspace/advisory/${fileName}`);
    if (!res.ok) throw new Error("Failed to load");
    return { activities, output: formatted, analysis };
  } catch {
    return { activities, output: formatted, analysis };
  }
}

export const SAMPLE_INPUTS: Record<string, Record<string, unknown>> = {
  "trial-balance-ingestion": {
    engagementName: DEMO_ENGAGEMENT.client,
    engagementType: DEMO_ENGAGEMENT.type,
    periodRange: "24 months (Jan 2024 – Dec 2025)",
    fileName: "TB_Horizon_FY25.csv",
  },
  "anomaly-detection": {
    engagementName: DEMO_ENGAGEMENT.client,
    materialityThreshold: "5%",
    focusAreas: ["Revenue", "Payroll", "AR", "Costs", "Margin"],
  },
  "driver-analysis": {
    engagementName: DEMO_ENGAGEMENT.client,
    selectedFindings: "All flagged anomalies (3)",
  },
  "follow-up-questions": {
    engagementName: DEMO_ENGAGEMENT.client,
    questionCount: "12",
    includeApprovedOnly: false,
  },
  "issue-tracker": {
    engagementName: DEMO_ENGAGEMENT.client,
    refreshFromPipeline: true,
  },
  "report-drafting": {
    engagementName: DEMO_ENGAGEMENT.client,
    templateType: "Word — Diligence Report",
    approvedOnly: true,
    periodRange: "36 months",
  },
};
