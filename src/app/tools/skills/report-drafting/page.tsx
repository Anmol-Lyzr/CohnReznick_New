"use client";

import { useEffect, useCallback, useRef } from "react";
import { FileText } from "lucide-react";
import { useAdvisoryJourney } from "@/hooks/use-advisory-journey";
import { JourneyLayout } from "@/components/journey-layout";
import { ClientNameDropdown } from "@/components/client-name-dropdown";
import { useEngagementSelection } from "@/hooks/use-engagement-selection";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { formatSkillMarkdown } from "@/lib/advisory-mappers";
import { syncReportFromIssues } from "@/lib/analysis-mutations";
import { getAnalysisForEngagement, isKnownEngagement } from "@/lib/engagement-analysis";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import { resolvePoCSampleEngagement } from "@/lib/client-sample-guard";
import { SAMPLE_INPUTS, loadSampleOutput } from "@/lib/sample-data";

export default function ReportDrafting() {
  const { state, execute, loadSampleData } = useAdvisoryJourney();
  const { getEngagementAnalysis } = useAdvisoryAnalysis();
  const { engagementName, setEngagementName, engagementNames } = useEngagementSelection();
  const mountedEngagementRef = useRef<string | null>(null);

  const displayAnalysis = useCallback(
    (raw: AdvisoryAnalysisOutput | null | undefined) => {
      if (!raw) return;
      const data = syncReportFromIssues(raw);
      loadSampleData(
        [],
        formatSkillMarkdown("report-drafting", data),
        "report-drafting",
        data,
        { persist: false }
      );
    },
    [loadSampleData]
  );

  const applySample = async () => {
    const s = SAMPLE_INPUTS["report-drafting"];
    const params = new URLSearchParams(window.location.search);
    const name = resolvePoCSampleEngagement(
      params.get("client"),
      (s.engagementName as string) || engagementName
    );
    if (!name) return;
    setEngagementName(name);
    const { activities, analysis } = await loadSampleOutput("report-drafting", name);
    const data = syncReportFromIssues(analysis);
    loadSampleData(activities, formatSkillMarkdown("report-drafting", data), "report-drafting", data);
  };

  useEffect(() => {
    const prev = mountedEngagementRef.current;
    mountedEngagementRef.current = engagementName;
    if (prev === engagementName) return;
    const stored = getEngagementAnalysis(engagementName);
    if (stored) {
      displayAnalysis(stored);
      return;
    }
    if (!isKnownEngagement(engagementName)) return;
    displayAnalysis(syncReportFromIssues(getAnalysisForEngagement(engagementName)));
  }, [engagementName, getEngagementAnalysis, displayAnalysis]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sample") !== "true") return;
    void applySample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <JourneyLayout
      skillId="report-drafting"
      title="Report & Workpaper Drafting"
      subtitle="Populate CohnReznick templates with approved anomaly findings"
      icon={FileText}
      state={state}
      onExecute={() =>
        execute("report-drafting", {
          engagementName,
          templateType: "Word — Diligence Report",
          approvedOnly: true,
        })
      }
      executeLabel="Draft Report"
      executeDisabled={!engagementName}
      toolbarSlot={
        <ClientNameDropdown
          value={engagementName}
          onChange={setEngagementName}
          names={engagementNames}
          variant="inline"
        />
      }
    />
  );
}
