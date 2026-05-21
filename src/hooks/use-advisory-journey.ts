"use client";

import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { useJourneyStream } from "@/hooks/use-journey-stream";

/** Journey stream that persists parsed advisory_analysis_output to global context */
export function useAdvisoryJourney() {
  const { mergeFromRaw } = useAdvisoryAnalysis();
  return useJourneyStream(mergeFromRaw);
}
