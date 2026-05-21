"use client";

import { useEffect, useCallback, useRef } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { useAdvisoryJourney } from "@/hooks/use-advisory-journey";
import { JourneyLayout } from "@/components/journey-layout";
import { ClientNameDropdown } from "@/components/client-name-dropdown";
import { useEngagementSelection } from "@/hooks/use-engagement-selection";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { formatSkillMarkdown } from "@/lib/advisory-mappers";
import { getAnalysisForEngagement, isKnownEngagement } from "@/lib/engagement-analysis";
import { syncReportFromIssues } from "@/lib/analysis-mutations";
import { SAMPLE_INPUTS, loadSampleOutput } from "@/lib/sample-data";

export default function FollowUpQuestions() {
  const { state, execute, loadSampleData } = useAdvisoryJourney();
  const { getEngagementAnalysis, setAnalysis } = useAdvisoryAnalysis();
  const { engagementName, setEngagementName, engagementNames, customNames } = useEngagementSelection();
  const mountedEngagementRef = useRef<string | null>(null);

  const displayAnalysis = useCallback(
    (data: ReturnType<typeof getEngagementAnalysis>) => {
      if (!data) return;
      loadSampleData(
        [],
        formatSkillMarkdown("follow-up-questions", data),
        "follow-up-questions",
        data,
        { persist: false }
      );
    },
    [loadSampleData]
  );

  const applySample = async () => {
    const s = SAMPLE_INPUTS["follow-up-questions"];
    setEngagementName(s.engagementName as string);
    const { activities, output, analysis } = await loadSampleOutput("follow-up-questions", s.engagementName as string);
    const synced = syncReportFromIssues(analysis);
    setAnalysis(synced);
    loadSampleData(activities, output, "follow-up-questions", synced);
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
      skillId="follow-up-questions"
      title="Smart Follow-Up Questions"
      subtitle="Generate prioritised, context-aware management questions for diligence calls"
      icon={MessageCircleQuestion}
      state={state}
      onExecute={() =>
        execute("follow-up-questions", {
          engagementName,
          questionCount: "12",
        })
      }
      executeLabel="Generate Questions"
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
