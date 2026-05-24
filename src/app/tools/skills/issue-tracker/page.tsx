"use client";

import { useEffect, useCallback, useRef } from "react";
import { ListChecks } from "lucide-react";
import { useAdvisoryJourney } from "@/hooks/use-advisory-journey";
import { JourneyLayout } from "@/components/journey-layout";
import { ClientNameDropdown } from "@/components/client-name-dropdown";
import { useEngagementSelection } from "@/hooks/use-engagement-selection";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { formatSkillMarkdown } from "@/lib/advisory-mappers";
import { getAnalysisForEngagement, isKnownEngagement } from "@/lib/engagement-analysis";
import { syncReportFromIssues } from "@/lib/analysis-mutations";
import { resolvePoCSampleEngagement } from "@/lib/client-sample-guard";
import { SAMPLE_INPUTS, loadSampleOutput } from "@/lib/sample-data";

export default function IssueTracker() {
  const { state, execute, loadSampleData } = useAdvisoryJourney();
  const { getEngagementAnalysis, setAnalysis } = useAdvisoryAnalysis();
  const { engagementName, setEngagementName, engagementNames } = useEngagementSelection();
  const mountedEngagementRef = useRef<string | null>(null);

  const displayAnalysis = useCallback(
    (data: ReturnType<typeof getEngagementAnalysis>) => {
      if (!data) return;
      loadSampleData(
        [],
        formatSkillMarkdown("issue-tracker", data),
        "issue-tracker",
        data,
        { persist: false }
      );
    },
    [loadSampleData]
  );

  const applySample = async () => {
    const s = SAMPLE_INPUTS["issue-tracker"];
    const params = new URLSearchParams(window.location.search);
    const name = resolvePoCSampleEngagement(
      params.get("client"),
      (s.engagementName as string) || engagementName
    );
    if (!name) return;
    setEngagementName(name);
    const { activities, output, analysis } = await loadSampleOutput("issue-tracker", name);
    const synced = syncReportFromIssues(analysis);
    setAnalysis(synced);
    loadSampleData(activities, output, "issue-tracker", synced);
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
    if (new URLSearchParams(window.location.search).get("sample") !== "true") return;
    void applySample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <JourneyLayout
      skillId="issue-tracker"
      title="Dynamic Issue Tracking"
      subtitle="Log findings with severity rankings and source account/period references"
      icon={ListChecks}
      state={state}
      onExecute={() => execute("issue-tracker", { engagementName, refreshFromPipeline: true })}
      executeLabel="Update Issue Log"
      executeDisabled={!engagementName}
      toolbarSlot={
        <ClientNameDropdown
          value={engagementName}
          onChange={setEngagementName}
          names={engagementNames}
          variant="inline"
        />
      }
      onSkillReviewChange={refreshFromStore}
    />
  );
}
