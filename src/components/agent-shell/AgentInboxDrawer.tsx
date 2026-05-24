"use client";

import Link from "next/link";
import { X, Inbox, ExternalLink } from "lucide-react";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { useAgentShell } from "@/context/AgentShellProvider";
import { skillHref } from "@/lib/agent-engagement-state";
import { cn } from "@/lib/utils";

export function AgentInboxDrawer() {
  const { inboxOpen, setInboxOpen } = useAgentShell();
  const { engagementStore } = useAdvisoryAnalysis();

  if (!inboxOpen) return null;

  const items: {
    client: string;
    issueId: string;
    summary: string;
    severity: string;
  }[] = [];

  for (const [client, analysis] of Object.entries(engagementStore)) {
    for (const issue of analysis.issue_log) {
      if (issue.review_status !== "PENDING_REVIEW") continue;
      items.push({
        client,
        issueId: issue.issue_id,
        summary: issue.issue_summary,
        severity: issue.severity,
      });
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setInboxOpen(false)} />
      <aside className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-card border-l border-border/60 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Review inbox</h2>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
              {items.length}
            </span>
          </div>
          <button type="button" onClick={() => setInboxOpen(false)} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No pending reviews</p>
          ) : (
            items.map((item) => (
              <Link
                key={`${item.client}-${item.issueId}`}
                href={skillHref("anomaly-detection", item.client, { review: "open" })}
                onClick={() => setInboxOpen(false)}
                className="block rounded-lg border border-border/50 p-3 hover:border-primary/30 hover:bg-primary/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                      item.severity === "HIGH"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    {item.severity}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
                <p className="text-xs font-semibold text-foreground mt-1">{item.summary}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.client}</p>
              </Link>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
