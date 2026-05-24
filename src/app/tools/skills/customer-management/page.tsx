"use client";

import Link from "next/link";
import { Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { buildLiveEngagementRows, getSkillStatus } from "@/lib/customer-management-live";
import {
  PIPELINE_STATUS_LABELS,
  DELIVER_STATUS_LABELS,
  SKILL_HREFS,
  type PipelineStatus,
  type DeliverStatus,
  type SkillId,
} from "@/lib/customer-management";
import { CustomerRowActions } from "@/components/agent-shell/CustomerRowActions";
import { SourceDocChip } from "@/components/source-doc-chip";

const PIPELINE_STATUS_STYLES: Record<PipelineStatus, string> = {
  complete: "bg-success/10 text-success border-success/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  not_started: "bg-muted text-muted-foreground border-border/50",
};

const DELIVER_STATUS_STYLES: Record<DeliverStatus, string> = {
  delivered: "bg-success/10 text-success border-success/20",
  ready: "bg-primary/10 text-primary border-primary/20",
  in_review: "bg-warning/10 text-warning border-warning/20",
  draft: "bg-muted text-muted-foreground border-border/50",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
};

const TABLE_SKILL_COLUMNS: { key: SkillId; label: string }[] = [
  { key: "anomaly-detection", label: "Anomaly Detection" },
  { key: "driver-analysis", label: "Driver Analysis" },
  { key: "follow-up-questions", label: "Question" },
  { key: "issue-tracker", label: "Issue Tracker" },
  { key: "report-drafting", label: "Report Drafting" },
];

function StatusBadge({ status, type }: { status: PipelineStatus | DeliverStatus; type: "pipeline" | "deliver" }) {
  const label =
    type === "pipeline"
      ? PIPELINE_STATUS_LABELS[status as PipelineStatus]
      : DELIVER_STATUS_LABELS[status as DeliverStatus];
  const style =
    type === "pipeline"
      ? PIPELINE_STATUS_STYLES[status as PipelineStatus]
      : DELIVER_STATUS_STYLES[status as DeliverStatus];

  return (
    <span className={cn("inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", style)}>
      {label}
    </span>
  );
}

export default function CustomerManagementPage() {
  const { engagementStore, storeVersion, sourceDocsByClient } = useAdvisoryAnalysis();
  const rows = buildLiveEngagementRows(engagementStore, sourceDocsByClient);

  const inReviewCount = rows.filter((r) => r.deliverStatus === "in_review").length;
  const readyCount = rows.filter((r) => r.deliverStatus === "ready" || r.deliverStatus === "delivered").length;

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 gap-4" key={storeVersion}>
      <div className="flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Customer Management</h1>
            <p className="text-xs text-muted-foreground">
              Live pipeline status — updates when you approve, reject, or edit anomalies
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-shrink-0 max-w-lg">
        {[
          { label: "Total Clients", value: rows.length },
          { label: "In Review", value: inReviewCount },
          { label: "Ready / Delivered", value: readyCount },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl px-4 py-3">
            <p className="text-[10px] font-medium text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 glass-card rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="text-[11px] font-semibold whitespace-nowrap">Client Name</TableHead>
                <TableHead className="text-[11px] font-semibold whitespace-nowrap min-w-[140px]">
                  Source Documents
                </TableHead>
                {TABLE_SKILL_COLUMNS.map((col) => (
                  <TableHead key={col.key} className="text-[11px] font-semibold whitespace-nowrap">
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="text-[11px] font-semibold whitespace-nowrap">Deliver Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.profile.id} className="border-border/40">
                  <TableCell className="font-semibold text-sm text-foreground whitespace-nowrap py-3 align-top">
                    <Link
                      href={`/tools/skills/anomaly-detection?client=${encodeURIComponent(row.profile.clientName)}`}
                      className="hover:text-primary transition-colors"
                    >
                      {row.profile.clientName}
                    </Link>
                    <CustomerRowActions row={row} />
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {row.profile.sourceDocs.map((doc) => (
                        <SourceDocChip
                          key={doc}
                          doc={doc}
                          clientName={row.profile.clientName}
                        />
                      ))}
                    </div>
                  </TableCell>
                  {TABLE_SKILL_COLUMNS.map((col) => {
                    const status = getSkillStatus(row, col.key);
                    return (
                      <TableCell key={col.key} className="py-3">
                        <Link
                          href={`${SKILL_HREFS[col.key]}?client=${encodeURIComponent(row.profile.clientName)}`}
                          className="inline-flex hover:opacity-80 transition-opacity"
                        >
                          <StatusBadge status={status} type="pipeline" />
                        </Link>
                      </TableCell>
                    );
                  })}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={row.deliverStatus} type="deliver" />
                      {row.deliverStatus === "in_review" && (
                        <Link
                          href={`/tools/skills/anomaly-detection?client=${encodeURIComponent(row.profile.clientName)}`}
                          className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          Review <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                      {row.deliverStatus === "ready" && (
                        <Link
                          href={`/tools/skills/report-drafting?client=${encodeURIComponent(row.profile.clientName)}`}
                          className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          Draft <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
