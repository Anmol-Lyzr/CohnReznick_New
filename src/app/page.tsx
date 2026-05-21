"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Info, Briefcase, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { EngagementCard } from "@/components/dashboard/EngagementCard";
import { InsightRow } from "@/components/dashboard/InsightRow";
import { SearchBar } from "@/components/dashboard/SearchBar";
import Logo from "@/components/logo/Logo";
import type { DashboardInsight, EngagementData, SuggestedAction } from "@/lib/types";
import { APP_METADATA, DEMO_ENGAGEMENT } from "@/lib/cohnreznick-metadata";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const INSIGHTS: DashboardInsight[] = [
  {
    id: "i1",
    severity: "critical",
    headline: "Revenue decline −18.4% MoM",
    summary: "Product sales (4100) fell sharply in Jan 2026 — correlates with AR movement and customer concentration risk.",
    category: "revenue",
    actionLabel: "Review Anomaly",
    href: "/tools/skills/anomaly-detection",
  },
  {
    id: "i2",
    severity: "warning",
    headline: "Payroll spike — three-payroll month",
    summary: "Mar 2025 payroll +42% vs trailing average. Likely 53-week calendar effect — verify normalization in workpapers.",
    category: "payroll",
    actionLabel: "Driver Analysis",
    href: "/tools/skills/driver-analysis",
  },
  {
    id: "i3",
    severity: "warning",
    headline: "AR days outstanding at 68 days",
    summary: "DSO expansion in Dec 2025 driven by Customer B payment term extension. Maps to revenue softness.",
    category: "working-capital",
    actionLabel: "View Issues",
    href: "/tools/skills/issue-tracker",
  },
  {
    id: "i4",
    severity: "info",
    headline: "4 anomalies pending review",
    summary: "Approve or reject flagged movements in Anomaly Detection before report drafting.",
    category: "review",
    actionLabel: "Anomaly Detection",
    href: "/tools/skills/anomaly-detection",
  },
];

const ENGAGEMENTS: EngagementData[] = [
  {
    id: "e1",
    client: DEMO_ENGAGEMENT.client,
    type: DEMO_ENGAGEMENT.type,
    progress: {
      ingestion: true,
      anomaly: true,
      driver: true,
      questions: true,
      issues: true,
      review: false,
      report: false,
    },
    lastActivity: "2 hours ago",
    industry: DEMO_ENGAGEMENT.industry,
  },
  {
    id: "e2",
    client: "Horizon Logistics LLC",
    type: "Financial Diligence",
    progress: {
      ingestion: true,
      anomaly: true,
      driver: false,
      questions: false,
      issues: false,
      review: false,
      report: false,
    },
    lastActivity: "Yesterday",
    industry: "Transportation",
  },
];

const SUGGESTED_ACTIONS: SuggestedAction[] = [
  {
    client: DEMO_ENGAGEMENT.client,
    label: "Review 4 pending anomalies",
    detail: "Approve or reject in Anomaly Detection before report drafting",
    href: "/tools/skills/anomaly-detection",
  },
  {
    client: DEMO_ENGAGEMENT.client,
    label: "Upload 36-month trial balance",
    detail: "Ingest and normalize TB data for new analysis run",
    href: "/tools/skills/trial-balance-ingestion",
  },
  {
    client: DEMO_ENGAGEMENT.client,
    label: "Generate diligence report draft",
    detail: "Compile approved findings into firm template",
    href: "/tools/skills/report-drafting",
  },
  {
    client: "Horizon Logistics LLC",
    label: "Run anomaly detection",
    detail: "TB ingested — ready for trend analysis",
    href: "/tools/skills/anomaly-detection",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const { dashboardInsights, primaryEngagement, analysis } = useAdvisoryAnalysis();
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [query, setQuery] = useState("");

  const insights = dashboardInsights.length > 0 ? dashboardInsights : INSIGHTS;
  const engagements: EngagementData[] = useMemo(() => {
    const list = primaryEngagement ? [primaryEngagement] : [];
    return list.length > 0 ? [...list, ...ENGAGEMENTS.slice(1)] : ENGAGEMENTS;
  }, [primaryEngagement]);

  const suggestedActions: SuggestedAction[] = useMemo(() => {
    if (!analysis) return SUGGESTED_ACTIONS;
    const pending = analysis.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
    return [
      {
        client: analysis.engagement.client_name,
        label: `Review ${pending} pending anomal${pending === 1 ? "y" : "ies"}`,
        detail: analysis.report.executive_summary.slice(0, 80) + "…",
        href: "/tools/skills/anomaly-detection",
      },
      ...SUGGESTED_ACTIONS.slice(1),
    ];
  }, [analysis]);

  const displayed = showAllInsights ? insights : insights.slice(0, 3);

  return (
    <div className="px-4 py-5 sm:px-6 max-w-[1050px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-6rem)]">
        <div className="mb-4 flex items-center gap-2.5">
          <Logo size={36} />
          <span className="text-2xl font-semibold text-foreground">CohnReznick</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Welcome, <span className="text-primary">Paul</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg">
          {APP_METADATA.title} — {APP_METADATA.pocScope}
        </p>
        <SearchBar
          query={query}
          onChange={setQuery}
          onSubmit={() => {
            if (query.trim()) {
              router.push(`/tools/skills/anomaly-detection?client=${encodeURIComponent(DEMO_ENGAGEMENT.client)}`);
            }
          }}
          suggestedActions={suggestedActions}
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-3 space-y-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Info className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Material Findings</h2>
            <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {insights.length}
            </span>
          </div>
          <div className="glass-card rounded-xl p-1">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-0">
              {displayed.map((insight, idx) => (
                <InsightRow key={insight.id} insight={insight} index={idx} />
              ))}
            </motion.div>
            {!showAllInsights && insights.length > 3 && (
              <button
                onClick={() => setShowAllInsights(true)}
                className="w-full py-1 text-[9px] font-medium text-primary hover:text-primary/80 transition-all flex items-center justify-center gap-1"
              >
                Show all {insights.length} findings <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            Active Diligences
            <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {engagements.length}
            </span>
          </h2>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-1.5">
            {engagements.map((e) => (
              <EngagementCard
                key={e.id}
                engagement={e}
                onClick={() =>
                  router.push(`/tools/skills/anomaly-detection?client=${encodeURIComponent(e.client)}`)
                }
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
