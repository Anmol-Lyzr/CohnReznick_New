"use client";

import { Bot, Inbox, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentShell } from "@/context/AgentShellProvider";
import { WORKFLOW_STEPS } from "@/lib/cohnreznick-metadata";

export function AgentContextBar() {
  const { snapshot, inboxCount, agentMode, setInboxOpen, hideShell } = useAgentShell();

  if (hideShell) return null;

  const stepMeta = WORKFLOW_STEPS.find((s) => s.step === snapshot.pipelineStep);
  const stepLabel = stepMeta?.action ?? `Step ${snapshot.pipelineStep}`;

  return (
    <div className="flex-shrink-0 border-b border-border/50 bg-gradient-to-r from-primary/[0.05] via-card/40 to-transparent px-4 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Bot className="h-3.5 w-3.5 text-primary" />
          {snapshot.clientName}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">
          Pipeline step {snapshot.pipelineStep}/9
        </span>
        <span
          className="hidden sm:inline text-muted-foreground truncate max-w-[280px]"
          title={stepLabel}
        >
          — {stepLabel}
        </span>
        {snapshot.blockerMessage && (
          <span className="text-warning font-medium">{snapshot.blockerMessage}</span>
        )}
        <div className="flex-1" />
        {inboxCount > 0 && (
          <button
            type="button"
            onClick={() => setInboxOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning hover:bg-warning/15"
          >
            <Inbox className="h-3 w-3" />
            {inboxCount} inbox
          </button>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
            agentMode === "live"
              ? "border-success/30 bg-success/10 text-success"
              : "border-primary/20 bg-primary/10 text-primary"
          )}
        >
          <Zap className="h-3 w-3" />
          {agentMode === "live" ? "Live Lyzr Agent" : "PoC sample"}
        </span>
      </div>
    </div>
  );
}
