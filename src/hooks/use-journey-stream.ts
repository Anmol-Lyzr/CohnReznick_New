"use client";

import { useState, useRef, useCallback } from "react";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import { extractAdvisoryOutput } from "@/lib/parse-advisory-output";
import { formatSkillMarkdown } from "@/lib/advisory-mappers";

export interface ActivityEvent {
  action: string;
  icon: string;
  ts: number;
  filePath?: string;
}

export interface JourneyState {
  isRunning: boolean;
  activities: ActivityEvent[];
  output: string;
  analysis: AdvisoryAnalysisOutput | null;
  agentMode: "live" | "demo" | null;
  error: string | null;
}

export function useJourneyStream(onAnalysisParsed?: (data: AdvisoryAnalysisOutput) => void) {
  const [state, setState] = useState<JourneyState>({
    isRunning: false,
    activities: [],
    output: "",
    analysis: null,
    agentMode: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const activeSkillRef = useRef<string>("");

  const applyParsedOutput = useCallback(
    (skill: string, rawOutput: string, structured?: AdvisoryAnalysisOutput | null) => {
      const parsed = structured ?? extractAdvisoryOutput(rawOutput);
      if (parsed) {
        const markdown = formatSkillMarkdown(skill, parsed);
        setState((s) => ({ ...s, output: markdown, analysis: parsed }));
        onAnalysisParsed?.(parsed);
        return parsed;
      }
      return null;
    },
    [onAnalysisParsed]
  );

  const execute = useCallback(async (skill: string, inputs: Record<string, unknown>, file?: File) => {
    activeSkillRef.current = skill;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ isRunning: true, activities: [], output: "", analysis: null, agentMode: null, error: null });

    try {
      const formData = new FormData();
      formData.append("skill", skill);
      formData.append("inputs", JSON.stringify(inputs));
      if (file) formData.append("document", file);

      const response = await fetch("/api/agent/journey/execute", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        setState(s => ({ ...s, isRunning: false, error: err }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setState(s => ({ ...s, isRunning: false, error: "No stream" }));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let streamedOutput = "";
      let streamedAnalysis: AdvisoryAnalysisOutput | null = null;
      let outputFromStructured = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "activity") {
                setState(s => ({ ...s, activities: [...s.activities, data as ActivityEvent] }));
              } else if (currentEvent === "delta" && !outputFromStructured) {
                const chunk = data.text as string;
                streamedOutput += chunk;
                setState(s => ({ ...s, output: s.output + chunk }));
              } else if (currentEvent === "structured") {
                const analysis = (data as { analysis?: AdvisoryAnalysisOutput }).analysis;
                if (analysis) {
                  streamedAnalysis = analysis;
                  outputFromStructured = true;
                  const markdown = formatSkillMarkdown(skill, analysis);
                  streamedOutput = markdown;
                  setState(s => ({ ...s, output: markdown, analysis }));
                  onAnalysisParsed?.(analysis);
                }
              } else if (currentEvent === "done") {
                const mode = (data as { mode?: "live" | "demo" }).mode ?? null;
                setState(s => ({ ...s, isRunning: false, agentMode: mode }));
              } else if (currentEvent === "error") {
                setState(s => ({ ...s, isRunning: false, error: data.error as string }));
              } else if (currentEvent === "generating") {
                setState(s => ({
                  ...s,
                  activities: [...s.activities, { action: (data.action as string) || "Generating deliverable...", icon: "cpu", ts: Date.now() }],
                }));
              }
            } catch { /* ignore parse errors */ }
            currentEvent = "";
          }
        }
      }

      if (!streamedAnalysis && streamedOutput) {
        const parsed = extractAdvisoryOutput(streamedOutput);
        if (parsed) {
          const markdown = formatSkillMarkdown(skill, parsed);
          onAnalysisParsed?.(parsed);
          setState(s => ({
            ...s,
            isRunning: false,
            analysis: parsed,
            output: markdown,
          }));
        } else {
          setState(s => ({ ...s, isRunning: false, output: streamedOutput }));
        }
      } else {
        setState(s => ({ ...s, isRunning: false }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setState(s => ({ ...s, isRunning: false, error: err.message }));
      }
    }
  }, [applyParsedOutput]);

  const loadSampleData = useCallback(
    (
      activities: ActivityEvent[],
      output: string,
      skill?: string,
      analysis?: AdvisoryAnalysisOutput | null,
      options?: { persist?: boolean }
    ) => {
      const parsed = analysis ?? (skill ? extractAdvisoryOutput(output) : null);
      const display =
        parsed && skill ? formatSkillMarkdown(skill, parsed) : output;
      setState({
        isRunning: false,
        activities,
        output: display,
        analysis: parsed,
        agentMode: null,
        error: null,
      });
      if (parsed && options?.persist !== false) onAnalysisParsed?.(parsed);
    },
    [onAnalysisParsed]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ isRunning: false, activities: [], output: "", analysis: null, agentMode: null, error: null });
  }, []);

  return { state, execute, reset, loadSampleData };
}
