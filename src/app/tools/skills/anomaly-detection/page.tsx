"use client";

import { useEffect, useCallback, useRef } from "react";
import { LineChart } from "lucide-react";
import { useAdvisoryJourney } from "@/hooks/use-advisory-journey";
import { JourneyLayout } from "@/components/journey-layout";
import { ClientNameDropdown } from "@/components/client-name-dropdown";
import { useEngagementSelection } from "@/hooks/use-engagement-selection";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { formatSkillMarkdown } from "@/lib/advisory-mappers";
import { getAnalysisForEngagement, isKnownEngagement } from "@/lib/engagement-analysis";
import { syncReportFromIssues } from "@/lib/analysis-mutations";
import { SAMPLE_INPUTS, loadSampleOutput } from "@/lib/sample-data";

const DEFAULT_FOCUS = ["Revenue", "Payroll", "AR", "Costs", "Margin"];

export default function AnomalyDetection() {
  const { state, execute, loadSampleData } = useAdvisoryJourney();
  const { getEngagementAnalysis, setAnalysis } = useAdvisoryAnalysis();
  const { engagementName, setEngagementName, engagementNames } = useEngagementSelection();
  const mountedEngagementRef = useRef<string | null>(null);

  const displayAnalysis = useCallback(
    (data: ReturnType<typeof getEngagementAnalysis>) => {
      if (!data) return;
      loadSampleData(
        [],
        formatSkillMarkdown("anomaly-detection", data),
        "anomaly-detection",
        data,
        { persist: false }
      );
    },
    [loadSampleData]
  );

  const refreshFromStore = useCallback(() => {
    displayAnalysis(getEngagementAnalysis(engagementName));
  }, [engagementName, getEngagementAnalysis, displayAnalysis]);

  const applySample = async () => {
    const s = SAMPLE_INPUTS["anomaly-detection"];
    setEngagementName(s.engagementName as string);
    const name = s.engagementName as string;
    const { activities, output, analysis } = await loadSampleOutput("anomaly-detection", name);
    const synced = syncReportFromIssues(analysis);
    setAnalysis(synced);
    loadSampleData(activities, output, "anomaly-detection", synced);
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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sample") === "true") applySample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <JourneyLayout
      skillId="anomaly-detection"
      title="Trend & Anomaly Detection"
      subtitle="Flag material movements in revenue, payroll, AR, costs, and margins"
      icon={LineChart}
      state={state}
      onExecute={() =>
        execute("anomaly-detection", {
          engagementName,
          materialityThreshold: "5%",
          focusAreas: DEFAULT_FOCUS,
        })
      }
      executeLabel="Run Detection"
      executeDisabled={!engagementName}
      onAnomalyReviewChange={refreshFromStore}
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
