"use client";

import Link from "next/link";
import { Sparkles, Play } from "lucide-react";
import { toast } from "sonner";
import type { LiveEngagementRow } from "@/lib/customer-management-live";
import { snapshotFromAnalysis, skillHref } from "@/lib/agent-engagement-state";
import { getNextStepCta } from "@/lib/agent-cta-catalog";
import { SKILL_LABELS } from "@/lib/customer-management";

export function CustomerRowActions({ row }: { row: LiveEngagementRow }) {
  const client = row.profile.clientName;
  const snap = snapshotFromAnalysis(row.analysis, client);
  const next = getNextStepCta(snap);

  return (
    <div className="flex flex-col gap-1 mt-1">
      {next?.href && (
        <Link
          href={next.href}
          className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary hover:underline"
        >
          <Play className="w-2.5 h-2.5" />
          {next.skillId ? SKILL_LABELS[next.skillId] : next.label}
        </Link>
      )}
      <button
        type="button"
        onClick={() =>
          toast.message("Agent suggestion", {
            description: `Re-run ${SKILL_LABELS[snap.nextSkillId ?? "anomaly-detection"]} with focus on ${row.profile.industry} patterns (demo)`,
          })
        }
        className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-primary"
      >
        <Sparkles className="w-2.5 h-2.5" />
        Agent suggest
      </button>
      {snap.pendingReviewCount > 0 && (
        <Link
          href={skillHref("anomaly-detection", client, { review: "open" })}
          className="text-[9px] text-warning font-semibold hover:underline"
        >
          Review {snap.pendingReviewCount}
        </Link>
      )}
    </div>
  );
}
