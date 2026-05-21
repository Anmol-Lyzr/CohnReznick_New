import { NextResponse } from "next/server";
import { SAMPLE_ADVISORY_OUTPUT } from "@/lib/sample-advisory-output";
import { toDashboardInsights } from "@/lib/advisory-mappers";

const data = SAMPLE_ADVISORY_OUTPUT;
const insights = toDashboardInsights(data);

export async function GET() {
  return NextResponse.json({
    metrics: [
      {
        id: "m1",
        label: "Active Diligences",
        value: "1",
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
