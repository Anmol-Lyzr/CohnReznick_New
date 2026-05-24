"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import {
  toDashboardInsights,
  toEngagementCard,
  toReviewFindings,
} from "@/lib/advisory-mappers";
import {
  finalizeAgentAnalysis,
  syncReportFromIssues,
  updateIssueInAnalysis,
  updateQuestionInAnalysis,
  type IssueUpdatePatch,
  type QuestionUpdatePatch,
} from "@/lib/analysis-mutations";
import { extractAdvisoryOutput } from "@/lib/parse-advisory-output";
import {
  loadEngagementStore,
  saveEngagementStore,
  type EngagementAnalysisStore,
} from "@/lib/advisory-store";
import { fetchEngagementStore, saveEngagementToStore } from "@/lib/store-api";
import { purgeRemovedEngagements } from "@/lib/removed-engagements";
import type { DashboardInsight, EngagementData, ReviewFinding } from "@/lib/types";

interface AdvisoryContextValue {
  analysis: AdvisoryAnalysisOutput | null;
  engagementStore: EngagementAnalysisStore;
  sourceDocsByClient: Record<string, string[]>;
  mongoConfigured: boolean;
  setAnalysis: (data: AdvisoryAnalysisOutput | null) => void;
  getEngagementAnalysis: (clientName: string) => AdvisoryAnalysisOutput | null;
  mergeFromRaw: (raw: unknown) => AdvisoryAnalysisOutput | null;
  reviewFindings: ReviewFinding[];
  dashboardInsights: DashboardInsight[];
  primaryEngagement: EngagementData | null;
  updateIssueReview: (
    issueId: string,
    patch: { review_status?: AdvisoryAnalysisOutput["issue_log"][0]["review_status"]; reviewer_comment?: string }
  ) => void;
  updateAnomalyIssue: (clientName: string, issueId: string, patch: IssueUpdatePatch) => AdvisoryAnalysisOutput | null;
  updateEngagementIssue: (clientName: string, issueId: string, patch: IssueUpdatePatch) => AdvisoryAnalysisOutput | null;
  updateFollowUpQuestion: (
    clientName: string,
    issueId: string,
    questionId: string,
    patch: QuestionUpdatePatch
  ) => AdvisoryAnalysisOutput | null;
  storeVersion: number;
}

const AdvisoryContext = createContext<AdvisoryContextValue | null>(null);

export function AdvisoryAnalysisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [engagementStore, setEngagementStore] = useState<EngagementAnalysisStore>({});
  const [sourceDocsByClient, setSourceDocsByClient] = useState<Record<string, string[]>>({});
  const [mongoConfigured, setMongoConfigured] = useState(false);
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [storeVersion, setStoreVersion] = useState(0);

  useEffect(() => {
    const client = searchParams.get("client")?.trim();
    if (client) setActiveClient(client);
  }, [pathname, searchParams]);

  useEffect(() => {
    const local = purgeRemovedEngagements(loadEngagementStore());
    saveEngagementStore(local);
    setEngagementStore(local);

    fetchEngagementStore().then(({ configured, store, sourceDocsByClient: docs }) => {
      setMongoConfigured(configured);
      setSourceDocsByClient(docs);
      if (configured && Object.keys(store).length > 0) {
        const merged = purgeRemovedEngagements({ ...local, ...store });
        setEngagementStore(merged);
        saveEngagementStore(merged);
        setStoreVersion((v) => v + 1);
      }
    });
  }, []);

  const analysis = useMemo(() => {
    if (activeClient) {
      return engagementStore[activeClient] ?? null;
    }
    const keys = Object.keys(engagementStore);
    return keys.length > 0 ? engagementStore[keys[0]] : null;
  }, [engagementStore, activeClient]);

  const bumpStore = useCallback(
    (store: EngagementAnalysisStore, client?: string, analysis?: AdvisoryAnalysisOutput) => {
      saveEngagementStore(store);
      setEngagementStore({ ...store });
      if (client) setActiveClient(client);
      setStoreVersion((v) => v + 1);
      if (mongoConfigured && client && analysis) {
        saveEngagementToStore(client, analysis).catch((err) =>
          console.error("[AdvisoryAnalysisProvider] Mongo save failed:", err)
        );
      }
    },
    [mongoConfigured]
  );

  const setAnalysis = useCallback(
    (data: AdvisoryAnalysisOutput | null) => {
      if (!data) {
        setActiveClient(null);
        return;
      }
      const store = loadEngagementStore();
      const synced = data._agent_v2_raw ? finalizeAgentAnalysis(data) : syncReportFromIssues(data);
      const client = synced.engagement.client_name;
      store[client] = synced;
      bumpStore(store, client, synced);
      if (mongoConfigured) {
        fetch(`/api/store/engagements/${encodeURIComponent(client)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((row: { sourceDocFilenames?: string[] } | null) => {
            if (row?.sourceDocFilenames?.length) {
              setSourceDocsByClient((prev) => ({ ...prev, [client]: row.sourceDocFilenames! }));
            }
          })
          .catch(() => undefined);
      }
    },
    [bumpStore, mongoConfigured]
  );

  const getEngagementAnalysis = useCallback(
    (clientName: string) => engagementStore[clientName] ?? null,
    [engagementStore]
  );

  const mergeFromRaw = useCallback(
    (raw: unknown): AdvisoryAnalysisOutput | null => {
      const parsed = extractAdvisoryOutput(raw);
      if (parsed) setAnalysis(parsed);
      return parsed;
    },
    [setAnalysis]
  );

  const updateEngagementIssue = useCallback(
    (clientName: string, issueId: string, patch: IssueUpdatePatch): AdvisoryAnalysisOutput | null => {
      const current = engagementStore[clientName];
      if (!current) return null;
      const next = updateIssueInAnalysis(current, issueId, patch);
      const store = { ...engagementStore, [clientName]: next };
      bumpStore(store, clientName, next);
      return next;
    },
    [engagementStore, bumpStore]
  );

  const updateAnomalyIssue = updateEngagementIssue;

  const updateFollowUpQuestion = useCallback(
    (
      clientName: string,
      issueId: string,
      questionId: string,
      patch: QuestionUpdatePatch
    ): AdvisoryAnalysisOutput | null => {
      const current = engagementStore[clientName];
      if (!current) return null;
      const next = updateQuestionInAnalysis(current, issueId, questionId, patch);
      const store = { ...engagementStore, [clientName]: next };
      bumpStore(store, clientName, next);
      return next;
    },
    [engagementStore, bumpStore]
  );

  const updateIssueReview = useCallback(
    (
      issueId: string,
      patch: {
        review_status?: AdvisoryAnalysisOutput["issue_log"][0]["review_status"];
        reviewer_comment?: string;
      }
    ) => {
      const client = activeClient ?? analysis?.engagement.client_name;
      if (!client) return;
      updateAnomalyIssue(client, issueId, patch);
    },
    [activeClient, analysis, updateAnomalyIssue]
  );

  const reviewFindings = useMemo(
    () => (analysis ? toReviewFindings(analysis) : []),
    [analysis]
  );

  const dashboardInsights = useMemo(
    () => (analysis ? toDashboardInsights(analysis) : []),
    [analysis]
  );

  const primaryEngagement = useMemo(
    () => (analysis ? toEngagementCard(analysis) : null),
    [analysis]
  );

  const value = useMemo(
    () => ({
      analysis,
      engagementStore,
      sourceDocsByClient,
      mongoConfigured,
      setAnalysis,
      getEngagementAnalysis,
      mergeFromRaw,
      reviewFindings,
      dashboardInsights,
      primaryEngagement,
      updateIssueReview,
      updateAnomalyIssue,
      updateEngagementIssue,
      updateFollowUpQuestion,
      storeVersion,
    }),
    [
      analysis,
      engagementStore,
      sourceDocsByClient,
      mongoConfigured,
      setAnalysis,
      getEngagementAnalysis,
      mergeFromRaw,
      reviewFindings,
      dashboardInsights,
      primaryEngagement,
      updateIssueReview,
      updateAnomalyIssue,
      updateEngagementIssue,
      updateFollowUpQuestion,
      storeVersion,
    ]
  );

  return <AdvisoryContext.Provider value={value}>{children}</AdvisoryContext.Provider>;
}

export function useAdvisoryAnalysis(): AdvisoryContextValue {
  const ctx = useContext(AdvisoryContext);
  if (!ctx) {
    throw new Error("useAdvisoryAnalysis must be used within AdvisoryAnalysisProvider");
  }
  return ctx;
}
