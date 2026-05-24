"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Info, Briefcase, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { EngagementCard } from "@/components/dashboard/EngagementCard";
import { InsightRow } from "@/components/dashboard/InsightRow";
import { SearchBar } from "@/components/dashboard/SearchBar";
import Logo from "@/components/logo/Logo";
import type { EngagementData, SuggestedAction } from "@/lib/types";
import { APP_METADATA } from "@/lib/cohnreznick-metadata";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { useAgentShell } from "@/context/AgentShellProvider";
import {
  buildDashboardEngagements,
  buildDashboardInsights,
  buildDashboardSuggestedActions,
} from "@/lib/dashboard-agent-suggestions";
import { snapshotFromAnalysis, skillHref } from "@/lib/agent-engagement-state";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

export default function Dashboard() {
  const router = useRouter();
  const { primaryEngagement, analysis, engagementStore } = useAdvisoryAnalysis();
  const { openChat } = useAgentShell();
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [query, setQuery] = useState("");

  const insights = useMemo(
    () => buildDashboardInsights(analysis, engagementStore),
    [analysis, engagementStore]
  );
  const engagements: EngagementData[] = useMemo(
    () => buildDashboardEngagements(engagementStore, primaryEngagement),
    [engagementStore, primaryEngagement]
  );

  const suggestedActions: SuggestedAction[] = useMemo(
    () => buildDashboardSuggestedActions(engagementStore, analysis),
    [engagementStore, analysis]
  );

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
            if (!query.trim()) return;
            openChat(query);
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
                key={e.client}
                engagement={e}
                onClick={() => {
                  const snap = snapshotFromAnalysis(engagementStore[e.client] ?? null, e.client);
                  const href = snap.nextSkillId
                    ? skillHref(snap.nextSkillId, e.client)
                    : `/tools/skills/anomaly-detection?client=${encodeURIComponent(e.client)}`;
                  router.push(href);
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
