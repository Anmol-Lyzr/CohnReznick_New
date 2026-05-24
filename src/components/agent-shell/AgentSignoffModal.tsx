"use client";

import { CheckCircle2, X } from "lucide-react";
import { useAgentShell } from "@/context/AgentShellProvider";
import { toast } from "sonner";

const CHECKLIST = [
  "All material anomalies reviewed and approved",
  "Driver narratives validated for HIGH findings",
  "Management questions included in agenda",
  "Issue log dispositions complete",
  "Report draft reviewed against workpapers",
];

export function AgentSignoffModal() {
  const { signoffOpen, setSignoffOpen, snapshot } = useAgentShell();

  if (!signoffOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[65] bg-black/40" onClick={() => setSignoffOpen(false)} />
      <div className="fixed left-1/2 top-1/2 z-[66] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-card shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Final sign-off — {snapshot.clientName}
          </h2>
          <button type="button" onClick={() => setSignoffOpen(false)} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          PoC step 9 — advisory team confirms diligence package before client delivery.
        </p>
        <ul className="space-y-2 mb-4">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs">
              <input type="checkbox" className="mt-0.5" defaultChecked />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setSignoffOpen(false)}
            className="px-3 py-1.5 text-xs rounded-lg border border-border/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setSignoffOpen(false);
              toast.success("Sign-off recorded", {
                description: `${snapshot.clientName} marked ready for delivery (demo)`,
              });
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-success text-success-foreground font-semibold"
          >
            Confirm sign-off
          </button>
        </div>
      </div>
    </>
  );
}
