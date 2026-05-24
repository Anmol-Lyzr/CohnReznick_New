"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_ENGAGEMENT_NAME,
  ENGAGEMENT_NAMES,
  ENGAGEMENT_STORAGE_KEY,
  getEngagementByName,
  isRemovedEngagement,
  type EngagementProfile,
} from "@/lib/customer-management";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import { normalizeEngagementInput, resolveEngagementName } from "@/lib/removed-engagements";

function resolveInitialName(clientParam: string | null): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(ENGAGEMENT_STORAGE_KEY)?.trim();
    if (clientParam != null && clientParam !== "") {
      return normalizeEngagementInput(clientParam);
    }
    if (stored) return normalizeEngagementInput(stored);
    return resolveEngagementName(null);
  }
  return resolveEngagementName(clientParam);
}

export function useEngagementSelection() {
  const router = useRouter();
  const { engagementStore } = useAdvisoryAnalysis();
  const [engagementName, setEngagementNameState] = useState(DEFAULT_ENGAGEMENT_NAME);
  const urlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEngagementNameState(resolveInitialName(params.get("client")));
  }, []);

  useEffect(() => {
    return () => {
      if (urlTimerRef.current) clearTimeout(urlTimerRef.current);
    };
  }, []);

  const profile: EngagementProfile | undefined = getEngagementByName(engagementName);

  const customNames = useMemo(
    () =>
      Object.keys(engagementStore)
        .filter((name) => name && !ENGAGEMENT_NAMES.includes(name) && !isRemovedEngagement(name))
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

  const syncUrl = useCallback(
    (name: string) => {
      const params = new URLSearchParams(window.location.search);
      const normalized = normalizeEngagementInput(name);
      if (normalized) {
        params.set("client", normalized);
      } else {
        params.delete("client");
      }
      const qs = params.toString();
      router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  const setEngagementName = useCallback(
    (name: string) => {
      setEngagementNameState(name);

      const forStorage = normalizeEngagementInput(name);
      if (forStorage) {
        localStorage.setItem(ENGAGEMENT_STORAGE_KEY, forStorage);
      } else {
        localStorage.removeItem(ENGAGEMENT_STORAGE_KEY);
      }

      if (urlTimerRef.current) clearTimeout(urlTimerRef.current);

      const isExistingBuiltIn = ENGAGEMENT_NAMES.includes(name.trim());
      const delay = name === "" || isExistingBuiltIn ? 0 : 250;

      if (delay === 0) {
        syncUrl(name);
      } else {
        urlTimerRef.current = setTimeout(() => syncUrl(name), delay);
      }
    },
    [syncUrl]
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
