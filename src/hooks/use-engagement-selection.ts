"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_ENGAGEMENT_NAME,
  ENGAGEMENT_NAMES,
  ENGAGEMENT_STORAGE_KEY,
  getEngagementByName,
  type EngagementProfile,
} from "@/lib/customer-management";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";

function resolveInitialName(clientParam: string | null): string {
  if (clientParam?.trim()) return clientParam.trim();
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(ENGAGEMENT_STORAGE_KEY)?.trim();
    if (stored) return stored;
  }
  return DEFAULT_ENGAGEMENT_NAME;
}

export function useEngagementSelection() {
  const router = useRouter();
  const { engagementStore } = useAdvisoryAnalysis();
  const [engagementName, setEngagementNameState] = useState(DEFAULT_ENGAGEMENT_NAME);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEngagementNameState(resolveInitialName(params.get("client")));
  }, []);

  const profile: EngagementProfile | undefined = getEngagementByName(engagementName);

  const customNames = useMemo(
    () =>
      Object.keys(engagementStore)
        .filter((name) => name && !ENGAGEMENT_NAMES.includes(name))
        .sort((a, b) => a.localeCompare(b)),
    [engagementStore]
  );

  const allNames = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const name of [...ENGAGEMENT_NAMES, ...customNames]) {
      if (seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
    return out;
  }, [customNames]);

  const setEngagementName = useCallback(
    (name: string) => {
      setEngagementNameState(name);
      const trimmed = name.trim();
      if (trimmed) {
        localStorage.setItem(ENGAGEMENT_STORAGE_KEY, trimmed);
      }
      const params = new URLSearchParams(window.location.search);
      if (trimmed) {
        params.set("client", trimmed);
      } else {
        params.delete("client");
      }
      const qs = params.toString();
      router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  return {
    engagementName,
    setEngagementName,
    profile,
    engagementNames: allNames,
    customNames,
    builtInNames: ENGAGEMENT_NAMES,
  };
}

export type { SkillId } from "@/lib/customer-management";
