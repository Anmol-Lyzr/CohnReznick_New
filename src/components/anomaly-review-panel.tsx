"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssueLogEntry, ReviewStatusAgent } from "@/lib/advisory-output-types";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import {
  buildAnomalyActionProposal,
  getDecisionOutcomeMessage,
  type AnomalyActionProposal,
} from "@/lib/anomaly-action-items";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { actionBtn, badge, btn, modal } from "@/lib/theme-classes";

const REVIEW_STYLES: Record<ReviewStatusAgent, string> = {
  PENDING_REVIEW: badge.pending,
  APPROVED: badge.approved,
  EDITED: badge.edited,
  REJECTED: badge.rejected,
};

const REVIEW_LABELS: Record<ReviewStatusAgent, string> = {
  PENDING_REVIEW: "PENDING",
  APPROVED: "ACCEPTED",
  EDITED: "EDITED",
  REJECTED: "REJECTED",
};

function fmtCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "+";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

function fmtPct(d: number): string {
  return `${(d * 100).toFixed(1)}%`;
}

function periodRange(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

function DetailSection({
  label,
  children,
  variant,
}: {
  label: string;
  children: React.ReactNode;
  variant?: "default" | "accept" | "reject";
}) {
  const border =
    variant === "accept"
      ? "border-success/25 bg-success/[0.04]"
      : variant === "reject"
        ? "border-destructive/25 bg-destructive/[0.04]"
        : "border-border/50 bg-background/60";

  return (
    <div className={cn("rounded-lg border p-3", border)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className="text-xs text-foreground/85 leading-relaxed">{children}</div>
    </div>
  );
}

function AnomalyDetailBody({
  issue,
  proposal,
  clientName,
  onUpdated,
  onClose,
  readOnly,
}: {
  issue: IssueLogEntry;
  proposal: AnomalyActionProposal;
  clientName: string;
  onUpdated?: () => void;
  onClose?: () => void;
  readOnly?: boolean;
}) {
  const { updateAnomalyIssue } = useAdvisoryAnalysis();
  const [editing, setEditing] = useState(false);
  const [editSummary, setEditSummary] = useState(issue.issue_summary);
  const [editNote, setEditNote] = useState(issue.reviewer_comment || "");

  const apply = (patch: Parameters<typeof updateAnomalyIssue>[2]) => {
    const next = updateAnomalyIssue(clientName, issue.issue_id, patch);
    if (next) onUpdated?.();
  };

  const handleApprove = () => {
    setEditing(false);
    apply({ review_status: "APPROVED" });
  };

  const handleReject = () => {
    setEditing(false);
    apply({ review_status: "REJECTED" });
  };

  const handleSaveEdit = () => {
    apply({
      review_status: "EDITED",
      issue_summary: editSummary.trim() || issue.issue_summary,
      reviewer_comment: editNote.trim(),
    });
    setEditing(false);
  };

  const isPending = issue.review_status === "PENDING_REVIEW";
  const outcome = getDecisionOutcomeMessage(issue.review_status, proposal);

  return (
    <div className={cn("flex flex-col max-h-[min(85vh,720px)]", modal.body)}>
      <div className={cn("relative flex items-start justify-between gap-2 px-4 py-3 border-b flex-shrink-0", modal.header)}>
        <div className="min-w-0 pr-6">
          <p className={cn("text-[10px] font-bold uppercase tracking-wider", modal.label)}>Anomaly detail</p>
          <h4 className={cn("text-sm font-bold leading-snug mt-0.5", modal.title)}>{proposal.title}</h4>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", REVIEW_STYLES[issue.review_status])}>
              {REVIEW_LABELS[issue.review_status]}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-primary/20 text-primary bg-card/80">
              {proposal.category}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 p-1 rounded-md hover:bg-black/[0.06] text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <DetailSection label="Impact & rationale">
          <p className="mb-2">
            <span className="font-semibold text-foreground/90">Rationale: </span>
            {proposal.rationale}
          </p>
          <p className="mb-2">
            <span className="font-semibold text-success">Impact if accepted: </span>
            {proposal.impactIfAccepted}
          </p>
          <p>
            <span className="font-semibold text-destructive">Cost of rejection: </span>
            {proposal.costOfRejection}
          </p>
        </DetailSection>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Confidence", value: `${proposal.confidencePct}%` },
            { label: "Financial impact", value: fmtCurrency(proposal.financialImpact) },
            { label: "Affected", value: String(proposal.affectedCount) },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-border/50 bg-white/70 px-2 py-2 text-center">
              <p className="text-[9px] font-bold uppercase text-muted-foreground">{m.label}</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>

        <DetailSection label="Action details">
          <p className="font-semibold text-foreground mb-1">{proposal.actionItem}</p>
          <p>{proposal.actionDescription}</p>
        </DetailSection>

        <DetailSection label="Overview">
          <dl className="space-y-1 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Issue ID</dt>
              <dd className="font-mono font-semibold">{issue.issue_id}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="font-semibold text-right">
                {issue.account_code} · {issue.account_name}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Period</dt>
              <dd>{periodRange(issue.period_start, issue.period_end)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Movement</dt>
              <dd>
                {fmtCurrency(issue.absolute_delta)} ({fmtPct(issue.mom_pct_change)} MoM)
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-mono text-[10px]">{proposal.type}</dd>
            </div>
          </dl>
        </DetailSection>

        {editing ? (
          <div className="space-y-2 rounded-lg border border-primary/25 bg-white/80 p-3">
            <label className="text-[10px] font-semibold text-foreground/70">Anomaly summary (saved permanently)</label>
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-primary/30 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <label className="text-[10px] font-semibold text-foreground/70">Advisory note</label>
            <input
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Reason for edit…"
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditSummary(issue.issue_summary);
                  setEditNote(issue.reviewer_comment || "");
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/85 leading-relaxed border-l-2 border-primary/40 pl-2">
            {issue.issue_summary}
          </p>
        )}

        {outcome && !editing && (
          <DetailSection
            label={issue.review_status === "REJECTED" ? "Decision recorded" : "Outcome"}
            variant={issue.review_status === "REJECTED" ? "reject" : "accept"}
          >
            {outcome}
          </DetailSection>
        )}
      </div>

      {readOnly && !editing && (
        <div className={cn("flex-shrink-0 p-4 border-t text-[10px] text-muted-foreground", modal.footer)}>
          Read-only — anomaly was decided in Anomaly Detection. Use Issue Tracker for operational disposition.
        </div>
      )}

      {isPending && !editing && !readOnly && (
        <div className={cn("flex-shrink-0 flex flex-wrap gap-2 p-4 border-t", modal.footer)}>
          <button
            type="button"
            onClick={handleApprove}
            className={cn("flex-1 min-w-[100px] flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg", btn.success)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Accept
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-white text-destructive hover:bg-destructive/10 border border-destructive/30"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            type="button"
            onClick={() => {
              setEditSummary(issue.issue_summary);
              setEditNote(issue.reviewer_comment || "");
              setEditing(true);
            }}
            className="w-full flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit before accept
          </button>
        </div>
      )}

      {!isPending && !editing && (
        <div className={cn("flex-shrink-0 p-4 border-t text-[10px] text-muted-foreground", modal.footer)}>
          Decision saved — updates Report Drafting and Customer Management automatically.
        </div>
      )}
    </div>
  );
}

/** Clickable cell in the anomalies table */
export function ActionRequiredButton({
  issue,
  onClick,
}: {
  issue: IssueLogEntry;
  onClick: () => void;
}) {
  const pending = issue.review_status === "PENDING_REVIEW";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex flex-col items-center justify-center min-w-[88px] px-2 py-1.5 rounded-md border text-center transition-colors",
        pending
          ? cn(actionBtn.pending, "shadow-sm")
          : issue.review_status === "REJECTED"
            ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15"
            : actionBtn.success
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide leading-tight">
        {pending ? "Action" : REVIEW_LABELS[issue.review_status]}
      </span>
      <span className="text-[9px] font-semibold leading-tight mt-0.5">
        {pending ? "required" : "view"}
      </span>
    </button>
  );
}

export function AnomalyDetailModal({
  open,
  onOpenChange,
  issue,
  clientName,
  onUpdated,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: IssueLogEntry | null;
  clientName: string;
  onUpdated?: () => void;
  readOnly?: boolean;
}) {
  if (!issue) return null;

  const proposal = buildAnomalyActionProposal(issue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[440px] w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden border-primary/15",
          "[&>button:last-child]:hidden"
        )}
      >
        <DialogTitle className="sr-only">{proposal.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Review anomaly {issue.issue_id} — accept or reject with impact on diligence deliverables.
        </DialogDescription>
        <AnomalyDetailBody
          key={issue.issue_id}
          issue={issue}
          proposal={proposal}
          clientName={clientName}
          onUpdated={onUpdated}
          onClose={() => onOpenChange(false)}
          readOnly={readOnly}
        />
      </DialogContent>
    </Dialog>
  );
}
