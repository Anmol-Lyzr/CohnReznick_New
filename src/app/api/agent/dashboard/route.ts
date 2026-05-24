import { NextResponse } from "next/server";
import { toDashboardInsights } from "@/lib/advisory-mappers";
import { DEFAULT_ENGAGEMENT_NAME, ENGAGEMENT_PROFILES } from "@/lib/customer-management";
import { getAnalysisForEngagement } from "@/lib/engagement-analysis";

const data = getAnalysisForEngagement(DEFAULT_ENGAGEMENT_NAME);
const insights = toDashboardInsights(data);

export async function GET() {
  return NextResponse.json({
    metrics: [
      {
        id: "m1",
        label: "Active Diligences",
        value: String(ENGAGEMENT_PROFILES.length),
        change: data.engagement.engagement_ref,
        changeType: "neutral",
        trend: "flat",
        detail: data.engagement.client_name,
      },
      {
        id: "m2",
        label: "Findings Pending Review",
        value: String(
          data.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length
        ),
        change: "—",
        changeType: "neutral",
        trend: "flat",
        detail: "human gate required",
      },
      {
        id: "m3",
        label: "TB Accounts Analyzed",
        value: String(data.engagement.total_accounts_parsed),
        change: data.engagement.period_start + " – " + data.engagement.period_end,
        changeType: "positive",
        trend: "up",
        detail: data.engagement.client_name,
      },
      {
        id: "m4",
        label: "Report Drafts",
        value: String(data.issue_log.filter((i) => i.review_status === "APPROVED").length),
        change: "approved issues",
        changeType: "neutral",
        trend: "flat",
        detail: `${data.summary_stats.total_issues} total issues`,
      },
    ],
    insights,
    summary_stats: data.summary_stats,
    engagement: data.engagement,
  });
}
