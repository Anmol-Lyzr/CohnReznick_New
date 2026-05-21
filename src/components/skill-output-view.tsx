"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ActionRequiredButton, AnomalyDetailModal } from "@/components/anomaly-review-panel";
import {
  SkillActionButton,
  DriverReviewModal,
  QuestionReviewModal,
  TrackerReviewModal,
  canOpenSkillAction,
} from "@/components/skill-review-modals";
import {
  exportCallAgendaMarkdown,
  getActiveIssuesForSkill,
  getFollowUpPipelineWarnings,
  getReportableIssues,
} from "@/lib/analysis-mutations";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import type { AdvisoryAnalysisOutput, FollowUpQuestion, IssueLogEntry, Severity } from "@/lib/advisory-output-types";
import { badge, flag, stat, gradientAccent, gradientAccentBorder } from "@/lib/theme-classes";

const SEVERITY_STYLES: Record<Severity, { bg: string; text: string; border: string }> = {
  HIGH: { bg: "bg-destructive/12", text: "text-destructive", border: "border-destructive/25" },
  MEDIUM: { bg: "bg-warning/15", text: "text-warning", border: "border-warning/30" },
  LOW: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/25" },
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

function OutputHeader({ analysis, skillTitle, accent }: { analysis: AdvisoryAnalysisOutput; skillTitle: string; accent: string }) {
  const e = analysis.engagement;
  return (
    <div className={cn("rounded-xl border p-4 mb-4", accent)}>
      <h2 className="text-lg font-bold text-foreground">{e.client_name}</h2>
      <p className="text-sm font-semibold text-foreground/80 mt-0.5">{skillTitle}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {e.engagement_ref} · {e.period_start} – {e.period_end} · {e.total_accounts_parsed} accounts · {e.currency}
      </p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2.5 text-center", color)}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  headerClass = "bg-primary/10",
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  headerClass?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border-2 border-border/60 shadow-sm">
      <table className="w-full text-xs border-collapse skill-data-table">
        <thead>
          <tr className={cn(headerClass, "border-b-2 border-border/50")}>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-bold text-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-border/40 transition-colors",
                i % 2 === 0 ? "bg-card/80" : "bg-muted/20",
                "hover:bg-primary/[0.04]"
              )}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-foreground/85 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border", s.bg, s.text, s.border)}>
      {severity}
    </span>
  );
}

function AnomalyDetectionView({
  data,
  onAnomalyReviewChange,
}: {
  data: AdvisoryAnalysisOutput;
  onAnomalyReviewChange?: () => void;
}) {
  const [modalIssueId, setModalIssueId] = useState<string | null>(null);
  const s = data.summary_stats;
  const issues = [...data.issue_log].sort((a, b) => a.display_order - b.display_order);
  const clientName = data.engagement.client_name;
  const modalIssue = modalIssueId ? issues.find((i) => i.issue_id === modalIssueId) ?? null : null;
  const pendingCount = issues.filter((i) => i.review_status === "PENDING_REVIEW").length;
  const acceptedCount = issues.filter((i) => ["APPROVED", "EDITED"].includes(i.review_status)).length;

  return (
    <div>
      <OutputHeader
        analysis={data}
        skillTitle="Trend & Anomaly Detection"
        accent={cn(gradientAccent, gradientAccentBorder)}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard label="Scanned" value={data.engagement.total_accounts_parsed} color={stat.default} />
        <StatCard label="Flagged" value={s.total_issues} color={stat.warning} />
        <StatCard label="HIGH" value={s.high_severity} color={stat.destructive} />
        <StatCard label="Suppressed" value={s.suppressed_anomalies} color={stat.success} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Material movements detected
        </h3>
        <div className="flex gap-2 text-[10px] font-semibold">
          <span className={cn("px-2 py-1 rounded-md border", badge.pending)}>
            Pending: {pendingCount}
          </span>
          <span className={cn("px-2 py-1 rounded-md border", badge.approved)}>
            Accepted: {acceptedCount}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border-2 border-border/60 shadow-sm">
        <table className="w-full text-xs border-collapse skill-data-table">
          <thead>
            <tr className="bg-primary/15 border-b-2 border-border/50">
              {["#", "Account", "Period", "Δ $", "Δ %", "Flag type", "Severity", "Z-Score est.", "Action"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-bold text-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map((i, idx) => (
              <tr
                key={i.issue_id}
                className={cn(
                  "border-b border-border/40 transition-colors",
                  idx % 2 === 0 ? "bg-card/80" : "bg-muted/20"
                )}
              >
                <td className="px-3 py-2.5 font-mono font-bold text-primary">{i.display_order}</td>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-[10px] text-muted-foreground">{i.account_code}</span>
                  <br />
                  {i.account_name}
                </td>
                <td className="px-3 py-2.5">{periodRange(i.period_start, i.period_end)}</td>
                <td className={cn("px-3 py-2.5 font-semibold", i.absolute_delta < 0 ? "text-destructive" : "text-success")}>
                  {fmtCurrency(i.absolute_delta)}
                </td>
                <td className={cn("px-3 py-2.5 font-semibold", i.mom_pct_change < 0 ? "text-destructive" : "text-success")}>
                  {fmtPct(i.mom_pct_change)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border", flag[i.flag_type as keyof typeof flag] || "bg-muted")}>
                    {i.flag_type}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <SeverityBadge severity={i.severity} />
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{(Math.abs(i.mom_pct_change) * 4.2).toFixed(1)}σ</td>
                <td className="px-3 py-2.5">
                  <ActionRequiredButton issue={i} onClick={() => setModalIssueId(i.issue_id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        Use <strong>Action required</strong> to review accept/reject impact for each flagged movement.
      </p>
      <AnomalyDetailModal
        open={modalIssueId !== null}
        onOpenChange={(open) => !open && setModalIssueId(null)}
        issue={modalIssue}
        clientName={clientName}
        onUpdated={onAnomalyReviewChange}
      />
      {data.suppressed_anomalies.length > 0 && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-success/40 bg-success/5 p-3">
          <p className="text-[10px] font-bold uppercase text-success mb-2">Suppressed (documented in workpapers)</p>
          <ul className="space-y-1.5 text-xs text-foreground/80">
            {data.suppressed_anomalies.map((a) => (
              <li key={`${a.account_code}-${a.period}`}>
                <strong>{a.account_name}</strong> · {a.period}: {fmtCurrency(a.absolute_delta)} — <em>{a.suppression_reason}</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function driverActionLabel(status: IssueLogEntry["driver_status"]): { label: string; sub: string; pending: boolean } {
  if (status === "PENDING") return { label: "Action", sub: "required", pending: true };
  if (status === "VALIDATED") return { label: "Validated", sub: "view", pending: false };
  if (status === "CHALLENGED") return { label: "Challenged", sub: "view", pending: false };
  return { label: "Insufficient", sub: "view", pending: false };
}

function DriverAnalysisView({
  data,
  onReviewChange,
}: {
  data: AdvisoryAnalysisOutput;
  onReviewChange?: () => void;
}) {
  const { updateEngagementIssue } = useAdvisoryAnalysis();
  const clientName = data.engagement.client_name;
  const [modalIssueId, setModalIssueId] = useState<string | null>(null);
  const issues = [...data.issue_log].sort((a, b) => a.display_order - b.display_order);
  const active = getActiveIssuesForSkill(data);
  const modalIssue = modalIssueId ? issues.find((i) => i.issue_id === modalIssueId) ?? null : null;
  const pendingDrivers = active.filter((i) => i.driver_status === "PENDING").length;
  const validated = active.filter((i) => i.driver_status === "VALIDATED").length;

  const validateAllHigh = () => {
    active.filter((i) => i.severity === "HIGH" && i.driver_status === "PENDING").forEach((i) => {
      updateEngagementIssue(clientName, i.issue_id, { driver_status: "VALIDATED" });
    });
    onReviewChange?.();
  };

  return (
    <div>
      <OutputHeader
        analysis={data}
        skillTitle="Driver Analysis — Cross-Account Attribution"
        accent={cn(gradientAccent, "border-accent/25")}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-muted-foreground italic max-w-xl">
          Validate agent driver narratives before management questions. Approve anomalies in Anomaly Detection first.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-md border", badge.accent)}>
            {validated} / {active.length} validated
          </span>
          {active.some((i) => i.severity === "HIGH" && i.driver_status === "PENDING") && (
            <button
              type="button"
              onClick={validateAllHigh}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Validate all HIGH
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {issues.map((i) => (
          <DriverCard key={i.issue_id} issue={i} onOpen={() => setModalIssueId(i.issue_id)} />
        ))}
      </div>
      <DriverReviewModal
        open={modalIssueId !== null}
        onOpenChange={(open) => !open && setModalIssueId(null)}
        issue={modalIssue}
        clientName={clientName}
        onUpdated={onReviewChange}
      />
      {pendingDrivers > 0 && (
        <p className="text-[10px] text-warning mt-2">{pendingDrivers} driver(s) pending validation.</p>
      )}
    </div>
  );
}

function DriverCard({ issue: i, onOpen }: { issue: IssueLogEntry; onOpen: () => void }) {
  const confColor =
    i.confidence === "HIGH" ? "text-success bg-success/10" : i.confidence === "MEDIUM" ? "text-warning bg-warning/10" : "text-muted-foreground bg-muted";
  return (
    <div className="rounded-xl border-2 border-accent/20 bg-gradient-to-br from-accent/[0.04] to-transparent overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-accent/10 border-b border-accent/15">
        <span className="font-mono text-xs font-bold text-accent">{i.issue_id}</span>
        <SeverityBadge severity={i.severity} />
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", confColor)}>{i.confidence} confidence</span>
        <span className="text-[10px] text-muted-foreground">{i.driver_category.replace(/_/g, " ")}</span>
        {(() => {
          const gate = canOpenSkillAction(i);
          const act = driverActionLabel(i.driver_status);
          return (
            <SkillActionButton
              pending={act.pending}
              label={act.label}
              sublabel={act.sub}
              variant={i.driver_status === "VALIDATED" ? "success" : "accent"}
              disabled={!gate.ok}
              title={gate.reason}
              onClick={onOpen}
            />
          );
        })()}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-foreground">{i.account_code} — {i.account_name}</p>
          <p className="text-xs text-muted-foreground">{periodRange(i.period_start, i.period_end)} · {fmtCurrency(i.absolute_delta)} ({fmtPct(i.mom_pct_change)} MoM)</p>
        </div>
        <p className="text-sm text-foreground/85 leading-relaxed border-l-4 border-accent/50 pl-3">{i.driver_explanation}</p>
        {i.correlated_accounts.length > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
            <p className="text-[10px] font-bold uppercase text-primary mb-2">Correlated accounts</p>
            <ul className="space-y-1.5">
              {i.correlated_accounts.map((c) => (
                <li key={c.account_code} className="text-xs flex gap-2">
                  <span className={cn("font-bold shrink-0", c.correlation_direction === "INVERSE" ? "text-warning" : "text-primary")}>
                    {c.correlation_direction}
                  </span>
                  <span><strong>{c.account_code}</strong> {c.account_name} — {c.correlation_note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {i.workpaper_ref && (
          <p className="text-[10px] text-muted-foreground">
            <span className="font-semibold text-primary">{i.workpaper_ref}</span>: {i.workpaper_excerpt}
          </p>
        )}
      </div>
    </div>
  );
}

function agendaActionLabel(status: FollowUpQuestion["agenda_status"]): { label: string; sub: string; pending: boolean } {
  if (status === "PENDING") return { label: "Action", sub: "required", pending: true };
  if (status === "INCLUDED" || status === "EDITED") return { label: "Included", sub: "view", pending: false };
  if (status === "DEFERRED") return { label: "Deferred", sub: "view", pending: false };
  return { label: "Excluded", sub: "view", pending: false };
}

function FollowUpQuestionsView({
  data,
  onReviewChange,
}: {
  data: AdvisoryAnalysisOutput;
  onReviewChange?: () => void;
}) {
  const { updateFollowUpQuestion } = useAdvisoryAnalysis();
  const clientName = data.engagement.client_name;
  const [modalTarget, setModalTarget] = useState<{ issueId: string; questionId: string } | null>(null);

  const allQ = data.issue_log.flatMap((i) =>
    i.follow_up_questions.map((q) => ({ ...q, issueId: i.issue_id, account: i.account_name, issue: i }))
  );
  const p1 = allQ.filter((q) => q.priority === 1);
  const p2 = allQ.filter((q) => q.priority === 2);
  const p3plus = allQ.filter((q) => q.priority >= 3);
  const categoriesCovered = new Set(allQ.map((q) => q.category)).size;

  const includedCount = allQ.filter((q) => q.agenda_status === "INCLUDED" || q.agenda_status === "EDITED").length;
  const pipelineWarnings = getFollowUpPipelineWarnings(data);

  const includeAllP1 = () => {
    data.issue_log.forEach((issue) => {
      if (!canOpenSkillAction(issue).ok) return;
      issue.follow_up_questions.filter((q) => q.priority === 1 && q.agenda_status === "PENDING").forEach((q) => {
        updateFollowUpQuestion(clientName, issue.issue_id, q.question_id, { agenda_status: "INCLUDED" });
      });
    });
    onReviewChange?.();
  };

  const exportAgenda = () => {
    const md = exportCallAgendaMarkdown(data, clientName);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName.replace(/\s+/g, "_")}_mgmt_agenda.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalIssue = modalTarget
    ? data.issue_log.find((i) => i.issue_id === modalTarget.issueId) ?? null
    : null;
  const modalQuestion = modalIssue?.follow_up_questions.find((q) => q.question_id === modalTarget?.questionId) ?? null;

  const PriorityBlock = ({
    title,
    questions,
    accent,
  }: {
    title: string;
    questions: typeof allQ;
    accent: string;
  }) =>
    questions.length ? (
      <div className={cn("rounded-xl border-2 p-4", accent)}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3">{title}</h3>
        <ol className="space-y-3 list-none">
          {questions.map((q, idx) => {
            const gate = canOpenSkillAction(q.issue);
            const act = agendaActionLabel(q.agenda_status);
            return (
              <li key={q.question_id} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/80 border-2 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{q.question_text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {q.category.replace(/_/g, " ")} · {q.question_type} · {q.issueId}
                    {q.requires_documentation && <span className="ml-1 text-primary font-semibold">· Doc required</span>}
                  </p>
                </div>
                <SkillActionButton
                  pending={act.pending}
                  label={act.label}
                  sublabel={act.sub}
                  variant={q.agenda_status === "INCLUDED" || q.agenda_status === "EDITED" ? "success" : "pending"}
                  disabled={!gate.ok}
                  title={gate.reason}
                  onClick={() => setModalTarget({ issueId: q.issueId, questionId: q.question_id })}
                />
              </li>
            );
          })}
        </ol>
      </div>
    ) : null;

  return (
    <div>
      <OutputHeader
        analysis={data}
        skillTitle="Management Follow-Up Questions"
        accent={cn(gradientAccent, gradientAccentBorder)}
      />
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatCard label="Categories covered" value={categoriesCovered} color={stat.default} />
        <StatCard label="Critical (P1)" value={p1.length} color={stat.destructive} />
        <StatCard label="Included in call" value={includedCount} color={stat.success} />
      </div>
      {pipelineWarnings.length > 0 && (
        <div className="mb-3 rounded-lg border border-warning/35 bg-warning/[0.08] px-3 py-2 space-y-1">
          {pipelineWarnings.map((w) => (
            <p key={w} className="text-[10px] text-warning leading-relaxed">
              {w}
            </p>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={includeAllP1}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Include all P1
        </button>
        <button
          type="button"
          onClick={exportAgenda}
          disabled={includedCount === 0}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-40"
        >
          Export call agenda
        </button>
      </div>
      <div className="space-y-3">
        <PriorityBlock title="Critical — discuss first" questions={p1} accent="border-destructive/30 bg-destructive/[0.06]" />
        <PriorityBlock title="High priority" questions={p2} accent="border-warning/35 bg-warning/[0.08]" />
        <PriorityBlock title="Medium / documentation" questions={p3plus} accent="border-primary/25 bg-primary/[0.06]" />
      </div>
      <QuestionReviewModal
        open={modalTarget !== null}
        onOpenChange={(open) => !open && setModalTarget(null)}
        question={modalQuestion}
        issue={modalIssue}
        clientName={clientName}
        onUpdated={onReviewChange}
      />
    </div>
  );
}

function trackerActionLabel(status: IssueLogEntry["tracker_status"]): { label: string; sub: string; pending: boolean } {
  if (status === "PENDING") return { label: "Action", sub: "required", pending: true };
  if (status === "ESCALATED") return { label: "Escalated", sub: "view", pending: true };
  if (status === "CONFIRMED") return { label: "Confirmed", sub: "view", pending: false };
  return { label: "Resolved", sub: "view", pending: false };
}

function IssueTrackerView({
  data,
  onReviewChange,
}: {
  data: AdvisoryAnalysisOutput;
  onReviewChange?: () => void;
}) {
  const { updateEngagementIssue } = useAdvisoryAnalysis();
  const clientName = data.engagement.client_name;
  const [modalIssueId, setModalIssueId] = useState<string | null>(null);
  const issues = [...data.issue_log].sort((a, b) => a.display_order - b.display_order);
  const active = getActiveIssuesForSkill(data);
  const openTracker = active.filter((i) => i.tracker_status === "PENDING" || i.tracker_status === "ESCALATED").length;
  const modalIssue = modalIssueId ? issues.find((i) => i.issue_id === modalIssueId) ?? null : null;

  const escalateAllHigh = () => {
    active
      .filter((i) => i.severity === "HIGH" && i.tracker_status === "PENDING")
      .forEach((i) => updateEngagementIssue(clientName, i.issue_id, { tracker_status: "ESCALATED" }));
    onReviewChange?.();
  };

  const statusStyle: Record<string, string> = {
    PENDING_REVIEW: badge.pending,
    APPROVED: badge.approved,
    EDITED: badge.edited,
    REJECTED: badge.rejected,
  };

  return (
    <div>
      <OutputHeader
        analysis={data}
        skillTitle="Dynamic Issue Log"
        accent={cn(gradientAccent, "border-primary/30")}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="grid grid-cols-3 gap-2 flex-1 max-w-lg">
          <StatCard label="Open disposition" value={openTracker} color={stat.warning} />
          <StatCard label="In log (active)" value={active.length} color={stat.success} />
          <StatCard label="Needs attention" value={data.summary_stats.needs_immediate_attention} color="bg-destructive/10 border-destructive/25" />
        </div>
        {active.some((i) => i.severity === "HIGH" && i.tracker_status === "PENDING") && (
          <button
            type="button"
            onClick={escalateAllHigh}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-destructive/90 text-white hover:bg-destructive"
          >
            Escalate all HIGH
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border-2 border-border/60 shadow-sm">
        <table className="w-full text-xs border-collapse skill-data-table">
          <thead>
            <tr className="bg-primary/15 border-b-2 border-border/50">
              {["ID", "Severity", "Account", "Period", "Summary", "Anomaly", "Action"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-bold text-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map((i, idx) => {
              const gate = canOpenSkillAction(i);
              const act = trackerActionLabel(i.tracker_status);
              return (
                <tr key={i.issue_id} className={cn("border-b border-border/40", idx % 2 === 0 ? "bg-card/80" : "bg-muted/20")}>
                  <td className="px-3 py-2.5 font-mono font-bold text-primary">{i.issue_id}</td>
                  <td className="px-3 py-2.5">
                    <SeverityBadge severity={i.severity} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[10px]">{i.account_code}</span> {i.account_name}
                  </td>
                  <td className="px-3 py-2.5">{periodRange(i.period_start, i.period_end)}</td>
                  <td className="px-3 py-2.5 max-w-[200px]">{i.issue_summary}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold border whitespace-nowrap", statusStyle[i.review_status])}>
                      {i.review_status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <SkillActionButton
                      pending={act.pending}
                      label={act.label}
                      sublabel={act.sub}
                      variant={i.tracker_status === "CONFIRMED" || i.tracker_status === "RESOLVED" ? "success" : "pending"}
                      disabled={!gate.ok}
                      title={gate.reason}
                      onClick={() => setModalIssueId(i.issue_id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TrackerReviewModal
        open={modalIssueId !== null}
        onOpenChange={(open) => !open && setModalIssueId(null)}
        issue={modalIssue}
        clientName={clientName}
        onUpdated={onReviewChange}
      />
    </div>
  );
}

function ReportDraftingView({ data }: { data: AdvisoryAnalysisOutput }) {
  const r = data.report;
  const approved = getReportableIssues(data);
  const pending = data.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
  const rejected = data.issue_log.filter((i) => i.review_status === "REJECTED").length;

  return (
    <div>
      <OutputHeader
        analysis={data}
        skillTitle="Diligence Report Draft"
        accent={cn(gradientAccent, "border-success/30")}
      />
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Approved in report" value={approved.length} color={stat.success} />
        <StatCard label="Pending review" value={pending} color={stat.warning} />
        <StatCard label="Rejected (excluded)" value={rejected} color="bg-destructive/10 border-destructive/25" />
      </div>
      {approved.length === 0 ? (
        <div className="rounded-xl border-2 border-warning/30 bg-warning/5 p-4 text-sm text-foreground/85">
          No approved anomalies yet. Approve findings in{" "}
          <strong>Anomaly Detection</strong> — rejected items are excluded automatically.
        </div>
      ) : (
        <>
          <div className="rounded-xl border-2 border-success/25 bg-success/[0.04] p-4 mb-4">
            <h3 className="text-xs font-bold uppercase text-success mb-2">Executive Summary</h3>
            <p className="text-sm text-foreground/90 leading-relaxed">{r.executive_summary}</p>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-success mb-2">
            Approved findings only
          </h3>
          <DataTable
            headerClass="bg-success/15"
            headers={["#", "Account", "Period", "Movement", "Driver", "Severity"]}
            rows={r.issue_table.map((row) => [
              <span key="issue-number" className="font-mono font-bold">{row.issue_number}</span>,
              row.account,
              row.period,
              <span key="movement" className="text-xs">{row.movement}</span>,
              <span key="driver" className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">{row.driver}</span>,
              <SeverityBadge key="severity" severity={row.severity} />,
            ])}
          />
          <div className="mt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">Findings detail</h3>
            {r.findings_detail.map((f) => (
              <div key={f.issue_id} className="rounded-lg border border-success/20 bg-success/[0.03] p-3">
                <p className="text-xs font-bold text-primary mb-1">{f.issue_id}</p>
                <p className="text-xs text-foreground/85"><strong>Observation:</strong> {f.observation}</p>
                <p className="text-xs text-foreground/75 mt-1"><strong>Implications:</strong> {f.implications}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TrialBalanceView({ data }: { data: AdvisoryAnalysisOutput }) {
  const e = data.engagement;
  return (
    <div>
      <OutputHeader
        analysis={data}
        skillTitle="Trial Balance Normalization Summary"
        accent={cn(gradientAccent, gradientAccentBorder)}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard label="Months" value={e.total_months} color={stat.default} />
        <StatCard label="Accounts" value={e.total_accounts_parsed} color={stat.muted} />
        <StatCard label="Warnings" value={data.summary_stats.parse_warnings} color={stat.warning} />
        <StatCard label="Materiality" value={`$${(e.materiality_threshold / 1000).toFixed(0)}K`} color={stat.default} />
      </div>
      <DataTable
        headerClass="bg-primary/15"
        headers={["Metric", "Value"]}
        rows={[
          ["Engagement ref", e.engagement_ref],
          ["Deal type", e.deal_type],
          ["Anomaly threshold", fmtPct(e.anomaly_pct_threshold)],
          ["Currency", e.currency],
          ["Status", <span key="status" className="text-success font-bold">Ready for anomaly detection</span>],
        ]}
      />
      {data.parse_warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs space-y-1">
          {data.parse_warnings.map((w, i) => (
            <p key={i}><strong>{w.warning_type}</strong> · {w.account_code}: {w.detail}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function SkillOutputView({
  skill,
  analysis,
  agentMode,
  onAnomalyReviewChange,
  onSkillReviewChange,
}: {
  skill: string;
  analysis: AdvisoryAnalysisOutput;
  agentMode?: "live" | "demo" | null;
  onAnomalyReviewChange?: () => void;
  onSkillReviewChange?: () => void;
}) {
  const onChange = onSkillReviewChange ?? onAnomalyReviewChange;
  return (
    <div className="skill-output-view space-y-2">
      {agentMode && (
        <span
          className={cn(
            "inline-block mb-2 text-[10px] font-semibold px-2 py-0.5 rounded-full",
            agentMode === "live" ? "bg-success/10 text-success border border-success/20" : "bg-muted text-muted-foreground"
          )}
        >
          {agentMode === "live" ? "Live Lyzr Agent" : "Demo / fallback"}
        </span>
      )}
      {skill === "trial-balance-ingestion" && <TrialBalanceView data={analysis} />}
      {skill === "anomaly-detection" && (
        <AnomalyDetectionView data={analysis} onAnomalyReviewChange={onAnomalyReviewChange} />
      )}
      {skill === "driver-analysis" && <DriverAnalysisView data={analysis} onReviewChange={onChange} />}
      {skill === "follow-up-questions" && <FollowUpQuestionsView data={analysis} onReviewChange={onChange} />}
      {skill === "issue-tracker" && <IssueTrackerView data={analysis} onReviewChange={onChange} />}
      {skill === "report-drafting" && <ReportDraftingView data={analysis} />}
      {!["trial-balance-ingestion", "anomaly-detection", "driver-analysis", "follow-up-questions", "issue-tracker", "report-drafting"].includes(skill) && (
        <p className="text-sm text-muted-foreground">Unsupported skill output view: {skill}</p>
      )}
    </div>
  );
}
