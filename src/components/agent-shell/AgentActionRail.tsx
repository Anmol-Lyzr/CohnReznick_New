"use client";

import { useState } from "react";
import {
  ChevronDown,
  MessageSquare,
  Play,
  Send,
  ClipboardCheck,
  Compass,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentCta, AgentCtaType } from "@/lib/agent-cta-catalog";
import { useAgentShell } from "@/context/AgentShellProvider";

const TYPE_STYLES: Record<AgentCtaType, string> = {
  run: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
  review: "bg-warning/15 text-warning border border-warning/25 hover:bg-warning/20",
  navigate: "bg-card border border-border/60 text-foreground hover:bg-muted/50",
  delegate: "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15",
  deliver: "bg-success/10 text-success border border-success/25 hover:bg-success/15",
};

const TYPE_ICONS: Record<AgentCtaType, React.ElementType> = {
  run: Play,
  review: ClipboardCheck,
  navigate: Compass,
  delegate: Sparkles,
  deliver: Send,
};

function CtaButton({ cta, onClick }: { cta: AgentCta; onClick: () => void }) {
  const Icon = TYPE_ICONS[cta.type];
  return (
    <button
      type="button"
      onClick={onClick}
      title={cta.description}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap",
        TYPE_STYLES[cta.type],
        cta.primary && cta.type === "run" && "ring-1 ring-primary/30"
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {cta.label}
    </button>
  );
}

export function AgentActionRail() {
  const { ctas, handleCta, setChatOpen, hideShell, skillHandlers } = useAgentShell();
  const [moreOpen, setMoreOpen] = useState(false);

  if (hideShell) return null;

  const primary = ctas.filter((c) => c.primary).slice(0, 2);
  const secondary = ctas.filter((c) => !primary.includes(c));
  const visible = [...primary, ...secondary.slice(0, 3)];
  const overflow = secondary.slice(3);

  return (
    <div className="flex-shrink-0 border-b border-border/40 bg-card/30 px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mr-1">
          Agent actions
        </span>
        {visible.map((cta) => (
          <CtaButton key={cta.id} cta={cta} onClick={() => handleCta(cta)} />
        ))}
        {overflow.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-medium border border-border/60 bg-card hover:bg-muted/50"
            >
              More <ChevronDown className={cn("h-3 w-3", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border/60 bg-card shadow-lg p-1 flex flex-col gap-0.5">
                  {overflow.map((cta) => (
                    <button
                      key={cta.id}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        handleCta(cta);
                      }}
                      className="text-left px-3 py-2 text-[11px] font-medium rounded-md hover:bg-muted/60"
                    >
                      {cta.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium border border-primary/20 text-primary hover:bg-primary/10"
        >
          <MessageSquare className="h-3 w-3" />
          Ask agent
        </button>
        {skillHandlers?.isRunning && (
          <span className="text-[10px] text-primary animate-pulse">Agent running…</span>
        )}
      </div>
    </div>
  );
}
