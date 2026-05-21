"use client";

import { useEffect, useCallback, useRef } from "react";
import { GitCompare } from "lucide-react";
import { useAdvisoryJourney } from "@/hooks/use-advisory-journey";
import { JourneyLayout } from "@/components/journey-layout";
import { ClientNameDropdown } from "@/components/client-name-dropdown";
import { useEngagementSelection } from "@/hooks/use-engagement-selection";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { formatSkillMarkdown } from "@/lib/advisory-mappers";
import { getAnalysisForEngagement, isKnownEngagement } from "@/lib/engagement-analysis";
import { syncReportFromIssues } from "@/lib/analysis-mutations";
import { SAMPLE_INPUTS, loadSampleOutput } from "@/lib/sample-data";

export default function DriverAnalysis() {
  const { state, execute, loadSampleData } = useAdvisoryJourney();
  const { getEngagementAnalysis, setAnalysis } = useAdvisoryAnalysis();
  const { engagementName, setEngagementName, engagementNames, customNames } = useEngagementSelection();
  const mountedEngagementRef = useRef<string | null>(null);

  const displayAnalysis = useCallback(
    (data: ReturnType<typeof getEngagementAnalysis>) => {
      if (!data) return;
      loadSampleData(
        [],
        formatSkillMarkdown("driver-analysis", data),
        "driver-analysis",
        data,
        { persist: false }
      );
    },
    [loadSampleData]
  );

  const applySample = async () => {
    const s = SAMPLE_INPUTS["driver-analysis"];
    setEngagementName(s.engagementName as string);
    const { activities, output, analysis } = await loadSampleOutput("driver-analysis", s.engagementName as string);
    const synced = syncReportFromIssues(analysis);
    setAnalysis(synced);
    loadSampleData(activities, output, "driver-analysis", synced);
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
    const data = syncReportFromIssues(getAnalysisForEngagement(engagementName));
    setAnalysis(data);
    displayAnalysis(data);
  }, [engagementName, getEngagementAnalysis, setAnalysis, displayAnalysis]);

  const refreshFromStore = useCallback(() => {
    displayAnalysis(getEngagementAnalysis(engagementName));
  }, [engagementName, getEngagementAnalysis, displayAnalysis]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sample") === "true") applySample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <JourneyLayout
      skillId="driver-analysis"
      title="Driver Analysis"
      subtitle="Explain flagged movements by cross-referencing related accounts"
      icon={GitCompare}
      state={state}
      onExecute={() =>
        execute("driver-analysis", {
          engagementName,
          selectedFindings: "All flagged anomalies (5)",
        })
      }
      executeLabel="Analyze Drivers"
      executeDisabled={!engagementName}
      toolbarSlot={
        <ClientNameDropdown
          value={engagementName}
          onChange={setEngagementName}
          names={engagementNames}
          customNames={customNames}
          variant="inline"
        />
      }
      onSkillReviewChange={refreshFromStore}
    />
  );
}
