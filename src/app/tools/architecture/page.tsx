"use client";

import { Cpu, GitBranch, Database, Layers, Shield, Zap, FileText } from "lucide-react";
import { APP_METADATA } from "@/lib/cohnreznick-metadata";

const ARCHITECTURE_LAYERS = [
  {
    title: "Agent Identity",
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10",
    files: ["SOUL.md", "RULES.md"],
    description: "CohnReznick advisory agent — junior analyst persona with mandatory human review gates.",
  },
  {
    title: "Skill Layer",
    icon: Zap,
    color: "text-warning",
    bg: "bg-warning/10",
    files: [
      "trial-balance-ingestion.md",
      "anomaly-detection.md",
      "driver-analysis.md",
      "follow-up-questions.md",
      "issue-tracker.md",
      "report-drafting.md",
    ],
    description: "Six agentic workflows mapped to the 36-month TB diligence PoC.",
  },
  {
    title: "Knowledge Base",
    icon: Database,
    color: "text-accent",
    bg: "bg-accent/10",
    files: ["diligence-methodology.md"],
    description: "Transaction advisory methodology and TB analysis framework.",
  },
  {
    title: "Client Workspace",
    icon: GitBranch,
    color: "text-success",
    bg: "bg-success/10",
    files: [
      "engagement-brief.md",
      "trial-balance-summary.md",
      "anomaly-findings.md",
      "driver-analysis.md",
      "issue-log.md",
      "diligence-report-draft.md",
    ],
    description: "Per-engagement workspace — isolated under workspace/advisory/.",
  },
  {
    title: "Data & AI Layer",
    icon: Layers,
    color: "text-secondary",
    bg: "bg-secondary/10",
    files: ["Trial Balance Files", "Supporting Workpapers", "Report Templates", "Azure OpenAI / Lyzr"],
    description: APP_METADATA.deployment,
  },
  {
    title: "Compliance & Guardrails",
    icon: Shield,
    color: "text-destructive",
    bg: "bg-destructive/10",
    files: ["Human review gate", "Source traceability", "No client data training", "Isolated instance"],
    description: "No client-facing output without advisory team approval. Every finding references source account and period.",
  },
];

export default function AgentArchitecture() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Cpu className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agent Architecture</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {APP_METADATA.title} — layered context for transaction diligence
        </p>
      </div>

      <div className="space-y-3">
        {ARCHITECTURE_LAYERS.map((layer, idx) => {
          const Icon = layer.icon;
          return (
            <div key={layer.title} className="glass-card rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${layer.bg} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${layer.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold text-muted-foreground/40 font-mono">LAYER {idx + 1}</span>
                    <h3 className="text-sm font-semibold text-foreground">{layer.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{layer.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.files.map((f) => (
                      <span key={f} className="text-[10px] font-mono bg-black/[0.04] text-muted-foreground px-2 py-0.5 rounded-lg">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
