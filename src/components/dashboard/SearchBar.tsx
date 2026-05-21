"use client";

import { motion } from "framer-motion";
import { Send, Mic, Paperclip, ArrowRight, Upload, LineChart, GitCompare, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SuggestedAction } from "@/lib/types";
import { DEMO_ENGAGEMENT } from "@/lib/cohnreznick-metadata";

const QUICK_CHIPS = [
  { icon: Upload, label: "Upload trial balance", href: "/tools/skills/trial-balance-ingestion" },
  { icon: LineChart, label: "Run anomaly detection", href: "/tools/skills/anomaly-detection" },
  { icon: GitCompare, label: "Driver analysis", href: "/tools/skills/driver-analysis" },
  { icon: CheckCircle2, label: "Review anomalies", href: "/tools/skills/anomaly-detection" },
];

interface SearchBarProps {
  query: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  suggestedActions: SuggestedAction[];
}

export function SearchBar({ query, onChange, onSubmit, suggestedActions }: SearchBarProps) {
  return (
    <div className="mt-6 w-full max-w-2xl">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Ask about trial balance trends, anomalies, or diligence findings..."
          className="w-full glass-input rounded-[18px] pl-5 pr-28 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/40"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <label className="p-2 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer" title="Attach trial balance file">
            <Paperclip className="w-4 h-4" />
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" />
          </label>
          <button type="button" className="p-2 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!query.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5 flex-wrap justify-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mr-1">Data Sources</span>
        {["Trial Balance", "Workpapers", "Report Templates", "Azure / Lyzr"].map((name) => (
          <span key={name} className="text-[10px] font-medium text-muted-foreground/70 bg-primary/[0.06] px-2 py-0.5 rounded-full border border-primary/10">
            {name}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {QUICK_CHIPS.map(({ icon: Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-muted-foreground bg-primary/[0.06] hover:bg-primary/[0.12] hover:text-primary border border-primary/10 transition-all"
          >
            <Icon className="w-3 h-3" />
            {label}
          </Link>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-4 w-full rounded-xl overflow-hidden text-left bg-white/[0.2] backdrop-blur-xl border border-white/[0.18] shadow-sm"
      >
        <div className="px-3.5 py-1.5 border-b border-white/[0.15]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">
            Suggested Actions — {DEMO_ENGAGEMENT.client}
          </p>
        </div>
        {suggestedActions.map((action, idx) => (
          <Link key={idx} href={action.href}>
            <div
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2 hover:bg-white/[0.3] transition-colors cursor-pointer group",
                idx !== 0 && "border-t border-white/[0.12]"
              )}
            >
              <p className="text-[11px] text-foreground/70 flex-1 min-w-0">
                <span className="font-semibold text-foreground">{action.label}</span>
                <span className="text-muted-foreground"> — {action.detail}</span>
              </p>
              <ArrowRight className="w-3 h-3 text-primary/0 group-hover:text-primary/50 transition-colors flex-shrink-0" />
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
