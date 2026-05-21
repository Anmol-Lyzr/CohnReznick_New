"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Pencil, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FollowUpQuestion,
  IssueLogEntry,
  DriverStatus,
  AgendaStatus,
  TrackerStatus,
  ReviewStatusAgent,
} from "@/lib/advisory-output-types";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { buildDriverActionProposal, getDriverOutcomeMessage } from "@/lib/driver-action-items";
import { buildQuestionActionProposal, getQuestionOutcomeMessage } from "@/lib/question-action-items";
import { buildTrackerActionProposal, getTrackerOutcomeMessage } from "@/lib/issue-tracker-action-items";
import { isAnomalyApprovedForDownstream } from "@/lib/analysis-mutations";
import { AnomalyDetailModal } from "@/components/anomaly-review-panel";
import type { SkillActionProposal } from "@/lib/skill-action-types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { actionBtn, badge, btn, modal } from "@/lib/theme-classes";

const REVIEW_LABELS: Record<ReviewStatusAgent, string> = {
  PENDING_REVIEW: "PENDING",
  APPROVED: "ACCEPTED",
  EDITED: "EDITED",
  REJECTED: "REJECTED",
};

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

function ProposalBody({
  headerLabel,
  proposal,
  statusBadge,
  categoryBadge,
  onClose,
  children,
  footer,
}: {
  headerLabel: string;
  proposal: SkillActionProposal;
  statusBadge: React.ReactNode;
  categoryBadge: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col max-h-[min(85vh,720px)]", modal.body)}>
      <div className={cn("relative flex items-start justify-between gap-2 px-4 py-3 border-b flex-shrink-0", modal.header)}>
        <div className="min-w-0 pr-6">
          <p className={cn("text-[10px] font-bold uppercase tracking-wider", modal.label)}>{headerLabel}</p>
          <h4 className={cn("text-sm font-bold leading-snug mt-0.5 line-clamp-3", modal.title)}>{proposal.title}</h4>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {statusBadge}
            {categoryBadge}
          </div>
        </div>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 p-1 rounded-md hover:bg-black/[0.06] text-muted-foreground" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
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
          {proposal.metrics.map((m) => (
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
        {children}
      </div>
      {footer}
    </div>
  );
}

const DRIVER_STYLES: Record<DriverStatus, string> = {
  PENDING: badge.pending,
  VALIDATED: badge.approved,
  CHALLENGED: badge.pending,
  INSUFFICIENT: badge.rejected,
};

const AGENDA_STYLES: Record<AgendaStatus, string> = {
  PENDING: badge.pending,
  INCLUDED: badge.approved,
  DEFERRED: badge.deferred,
  EXCLUDED: badge.excluded,
  EDITED: badge.edited,
};

const TRACKER_STYLES: Record<TrackerStatus, string> = {
  PENDING: badge.pending,
  CONFIRMED: badge.approved,
  ESCALATED: badge.rejected,
  RESOLVED: badge.edited,
};

export function SkillActionButton({
  pending,
  label,
  sublabel,
  variant = "pending",
  onClick,
  disabled,
  title,
}: {
  pending: boolean;
  label: string;
  sublabel: string;
  variant?: "pending" | "success" | "accent" | "muted";
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    pending: actionBtn.pending,
    success: actionBtn.success,
    accent: actionBtn.accent,
    muted: actionBtn.muted,
  };

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      className={cn(
        "inline-flex flex-col items-center justify-center min-w-[88px] px-2 py-1.5 rounded-md border text-center transition-colors",
        pending ? styles.pending : styles[variant],
        disabled && styles.muted
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide leading-tight">{label}</span>
      <span className="text-[9px] font-semibold leading-tight mt-0.5">{sublabel}</span>
    </button>
  );
}

export function DriverReviewModal({
  open,
  onOpenChange,
  issue,
  clientName,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: IssueLogEntry | null;
  clientName: string;
  onUpdated?: () => void;
}) {
  const { updateEngagementIssue } = useAdvisoryAnalysis();
  if (!issue) return null;
  const proposal = buildDriverActionProposal(issue);
  const pending = issue.driver_status === "PENDING";
  const outcome = getDriverOutcomeMessage(issue.driver_status, proposal);

  const apply = (driver_status: DriverStatus) => {
    updateEngagementIssue(clientName, issue.issue_id, { driver_status });
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden border-primary/15 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{proposal.title}</DialogTitle>
        <DialogDescription className="sr-only">Validate driver narrative for {issue.issue_id}</DialogDescription>
        <ProposalBody
          headerLabel="Driver detail"
          proposal={proposal}
          statusBadge={
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", DRIVER_STYLES[issue.driver_status])}>
              {issue.driver_status}
            </span>
          }
          categoryBadge={
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-accent/25 text-accent bg-card/80">
              {proposal.category}
            </span>
          }
          onClose={() => onOpenChange(false)}
          footer={
            pending ? (
              <div className={cn("flex-shrink-0 flex flex-col gap-2 p-4 border-t", modal.footer)}>
                <div className="flex gap-2">
                  <button type="button" onClick={() => apply("VALIDATED")} className={cn("flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg", btn.success)}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Validate driver
                  </button>
                  <button type="button" onClick={() => apply("CHALLENGED")} className={cn("flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-card text-warning border border-warning/40 hover:bg-warning/10")}>
                    <XCircle className="w-3.5 h-3.5" /> Challenge
                  </button>
                </div>
                <button type="button" onClick={() => apply("INSUFFICIENT")} className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15">
                  Insufficient evidence
                </button>
              </div>
            ) : (
              <div className="flex-shrink-0 p-4 border-t text-[10px] text-muted-foreground">Decision saved.</div>
            )
          }
        >
          {outcome && (
            <DetailSection label="Outcome" variant={issue.driver_status === "VALIDATED" ? "accept" : "reject"}>
              {outcome}
            </DetailSection>
          )}
          <p className="text-[10px] text-muted-foreground">
            Anomaly review: <strong>{REVIEW_LABELS[issue.review_status]}</strong>
          </p>
        </ProposalBody>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionReviewModal({
  open,
  onOpenChange,
  question,
  issue,
  clientName,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: FollowUpQuestion | null;
  issue: IssueLogEntry | null;
  clientName: string;
  onUpdated?: () => void;
}) {
  const { updateFollowUpQuestion } = useAdvisoryAnalysis();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(question?.question_text ?? "");

  if (!question || !issue) return null;
  const proposal = buildQuestionActionProposal(question, issue);
  const pending = question.agenda_status === "PENDING";
  const outcome = getQuestionOutcomeMessage(question.agenda_status, proposal);

  const apply = (agenda_status: AgendaStatus, question_text?: string) => {
    updateFollowUpQuestion(clientName, issue.issue_id, question.question_id, {
      agenda_status,
      ...(question_text != null ? { question_text } : {}),
    });
    setEditing(false);
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden border-primary/15 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{proposal.title}</DialogTitle>
        <DialogDescription className="sr-only">Agenda decision for {question.question_id}</DialogDescription>
        <ProposalBody
          headerLabel="Question detail"
          proposal={proposal}
          statusBadge={
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", AGENDA_STYLES[question.agenda_status])}>
              {question.agenda_status}
            </span>
          }
          categoryBadge={
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-primary/25 text-primary bg-card/80">
              P{question.priority}
            </span>
          }
          onClose={() => onOpenChange(false)}
          footer={
            pending && !editing ? (
              <div className={cn("flex-shrink-0 flex flex-col gap-2 p-4 border-t", modal.footer)}>
                <button type="button" onClick={() => apply("INCLUDED")} className={cn("w-full flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg", btn.success)}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Include in call
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => apply("DEFERRED")} className={cn("flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-card", btn.outline)}>
                    Defer
                  </button>
                  <button type="button" onClick={() => apply("EXCLUDED")} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-border text-muted-foreground hover:bg-muted/30">
                    Exclude
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditText(question.question_text);
                    setEditing(true);
                  }}
                  className="w-full flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 text-primary border border-primary/25"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit wording
                </button>
              </div>
            ) : editing ? (
              <div className={cn("flex-shrink-0 p-4 border-t space-y-2", modal.footer)}>
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="w-full text-sm rounded-lg border px-3 py-2" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => apply("EDITED", editText.trim())} className="flex-1 text-xs font-semibold py-2 rounded-lg bg-primary text-primary-foreground">
                    Save & include
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted-foreground px-3">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 p-4 border-t text-[10px] text-muted-foreground">Decision saved.</div>
            )
          }
        >
          {outcome && (
            <DetailSection label="Outcome" variant={question.agenda_status === "EXCLUDED" ? "reject" : "accept"}>
              {outcome}
            </DetailSection>
          )}
        </ProposalBody>
      </DialogContent>
    </Dialog>
  );
}

export function TrackerReviewModal({
  open,
  onOpenChange,
  issue,
  clientName,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: IssueLogEntry | null;
  clientName: string;
  onUpdated?: () => void;
}) {
  const { updateEngagementIssue } = useAdvisoryAnalysis();
  const [anomalyOpen, setAnomalyOpen] = useState(false);
  if (!issue) return null;
  const proposal = buildTrackerActionProposal(issue);
  const pending = issue.tracker_status === "PENDING";
  const outcome = getTrackerOutcomeMessage(issue.tracker_status, proposal);
  const anomalyDecided = issue.review_status !== "PENDING_REVIEW";

  const apply = (tracker_status: TrackerStatus) => {
    updateEngagementIssue(clientName, issue.issue_id, { tracker_status });
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden border-primary/15 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{proposal.title}</DialogTitle>
        <DialogDescription className="sr-only">Issue disposition for {issue.issue_id}</DialogDescription>
        <ProposalBody
          headerLabel="Issue detail"
          proposal={proposal}
          statusBadge={
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", TRACKER_STYLES[issue.tracker_status])}>
              {issue.tracker_status}
            </span>
          }
          categoryBadge={
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-primary/25 text-primary bg-white/50">
              {issue.severity}
            </span>
          }
          onClose={() => onOpenChange(false)}
          footer={
            pending || issue.tracker_status === "ESCALATED" ? (
              <div className={cn("flex-shrink-0 flex flex-col gap-2 p-4 border-t", modal.footer)}>
                <button type="button" onClick={() => apply("CONFIRMED")} className={cn("w-full flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg", btn.success)}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm in log
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => apply("ESCALATED")} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                  </button>
                  <button type="button" onClick={() => apply("RESOLVED")} className={cn("flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-card", btn.outline)}>
                    Resolve
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 p-4 border-t text-[10px] text-muted-foreground">Disposition saved.</div>
            )
          }
        >
          {outcome && (
            <DetailSection label="Outcome" variant={issue.tracker_status === "RESOLVED" || issue.tracker_status === "CONFIRMED" ? "accept" : "reject"}>
              {outcome}
            </DetailSection>
          )}
          <div className="rounded-lg border border-warning/25 bg-warning/5 p-2 text-[10px] space-y-1.5">
            <p>
              <span className="font-semibold">Anomaly (read-only):</span> {REVIEW_LABELS[issue.review_status]} · Driver: {issue.driver_status}
            </p>
            {anomalyDecided && (
              <button
                type="button"
                onClick={() => setAnomalyOpen(true)}
                className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
              >
                <ArrowUpRight className="w-3 h-3" /> View anomaly decision
              </button>
            )}
          </div>
        </ProposalBody>
      </DialogContent>
      <AnomalyDetailModal
        open={anomalyOpen}
        onOpenChange={setAnomalyOpen}
        issue={issue}
        clientName={clientName}
        readOnly
      />
    </Dialog>
  );
}

export function canOpenSkillAction(issue: IssueLogEntry): { ok: boolean; reason?: string } {
  if (issue.review_status === "REJECTED") return { ok: false, reason: "Rejected in Anomaly Detection" };
  if (!isAnomalyApprovedForDownstream(issue)) return { ok: false, reason: "Approve in Anomaly Detection first" };
  return { ok: true };
}
