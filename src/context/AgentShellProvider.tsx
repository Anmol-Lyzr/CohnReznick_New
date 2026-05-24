"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdvisoryAnalysis } from "@/context/AdvisoryAnalysisProvider";
import type { AgentCta } from "@/lib/agent-cta-catalog";
import {
  commandPaletteItems,
  getCtAsForPage,
  pathnameToPageId,
  pageIdToSkillId,
} from "@/lib/agent-cta-catalog";
import {
  countGlobalInbox,
  getActiveClientName,
  snapshotFromAnalysis,
  skillHref,
  type EngagementSnapshot,
} from "@/lib/agent-engagement-state";
import type { SkillId } from "@/lib/customer-management";
import { DEFAULT_ENGAGEMENT_NAME, ENGAGEMENT_STORAGE_KEY } from "@/lib/customer-management";

export interface SkillShellHandlers {
  skillId: SkillId;
  onExecute: () => void;
  executeLabel: string;
  isRunning?: boolean;
}

interface AgentShellContextValue {
  pageId: ReturnType<typeof pathnameToPageId>;
  snapshot: EngagementSnapshot;
  ctas: AgentCta[];
  inboxCount: number;
  agentMode: "live" | "demo";
  chatOpen: boolean;
  chatSeed: string | null;
  inboxOpen: boolean;
  commandOpen: boolean;
  signoffOpen: boolean;
  setChatOpen: (v: boolean) => void;
  openChat: (message?: string) => void;
  setInboxOpen: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setSignoffOpen: (v: boolean) => void;
  handleCta: (cta: AgentCta) => void;
  registerSkill: (handlers: SkillShellHandlers) => void;
  unregisterSkill: () => void;
  skillHandlers: SkillShellHandlers | null;
  commandItems: ReturnType<typeof commandPaletteItems>;
  hideShell: boolean;
}

const AgentShellContext = createContext<AgentShellContextValue | null>(null);

export function AgentShellProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { engagementStore, getEngagementAnalysis } = useAdvisoryAnalysis();

  const [skillHandlers, setSkillHandlers] = useState<SkillShellHandlers | null>(null);
  const [chatOpen, setChatOpenState] = useState(false);
  const [chatSeed, setChatSeed] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [signoffOpen, setSignoffOpen] = useState(false);
  // SSR-safe default — localStorage is applied in useEffect only (avoids hydration mismatch)
  const [clientName, setClientName] = useState(DEFAULT_ENGAGEMENT_NAME);

  useEffect(() => {
    const urlClient = new URLSearchParams(window.location.search).get("client");
    setClientName(getActiveClientName(engagementStore, urlClient, { readStorage: true }));
  }, [pathname, engagementStore]);

  const pageId = pathnameToPageId(pathname);
  const analysis = getEngagementAnalysis(clientName);
  const snapshot = useMemo(
    () => snapshotFromAnalysis(analysis, clientName),
    [analysis, clientName]
  );

  const ctas = useMemo(() => getCtAsForPage(pageId, snapshot), [pageId, snapshot]);
  const inboxCount = useMemo(() => countGlobalInbox(engagementStore), [engagementStore]);
  const storeClients = useMemo(() => Object.keys(engagementStore), [engagementStore]);
  const commandItems = useMemo(
    () => commandPaletteItems(snapshot, storeClients),
    [snapshot, storeClients]
  );

  const agentMode: "live" | "demo" =
    analysis?._agent_meta || analysis?._agent_v2_raw
      ? "live"
      : process.env.NEXT_PUBLIC_AGENT_LIVE === "true"
        ? "live"
        : "demo";

  const hideShell = pathname.startsWith("/documents");

  const setChatOpen = useCallback((v: boolean) => {
    setChatOpenState(v);
    if (!v) setChatSeed(null);
  }, []);

  const openChat = useCallback((message?: string) => {
    if (message?.trim()) setChatSeed(message.trim());
    setChatOpenState(true);
  }, []);

  const registerSkill = useCallback((handlers: SkillShellHandlers) => {
    setSkillHandlers(handlers);
  }, []);

  const unregisterSkill = useCallback(() => {
    setSkillHandlers(null);
  }, []);

  const openReviewFlow = useCallback(() => {
    const skill = pageIdToSkillId(pageId);
    if (skill === "anomaly-detection" || pageId === "anomaly-detection") {
      window.dispatchEvent(new CustomEvent("agent-shell:open-review"));
      const el = document.getElementById("skill-output-review");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (analysis && snapshot.pendingReviewCount > 0) {
      router.push(skillHref("anomaly-detection", clientName, { review: "open" }));
      return;
    }
    setInboxOpen(true);
  }, [pageId, analysis, snapshot.pendingReviewCount, clientName, router]);

  const handleCta = useCallback(
    (cta: AgentCta) => {
      if (cta.action === "execute" && skillHandlers && cta.skillId === skillHandlers.skillId) {
        skillHandlers.onExecute();
        return;
      }
      if (cta.action === "execute" && cta.href) {
        router.push(cta.href);
        return;
      }
      if (cta.action === "review" || cta.type === "review") {
        if (cta.href) {
          router.push(cta.href);
          setTimeout(() => window.dispatchEvent(new CustomEvent("agent-shell:open-review")), 400);
        } else {
          openReviewFlow();
        }
        return;
      }
      if (cta.action === "inbox") {
        if (cta.href) router.push(cta.href);
        else setInboxOpen(true);
        return;
      }
      if (cta.action === "chat") {
        setChatOpen(true);
        return;
      }
      if (cta.action === "signoff") {
        setSignoffOpen(true);
        return;
      }
      if (cta.type === "run" && cta.href) {
        router.push(cta.href);
        return;
      }
      if (cta.href) {
        router.push(cta.href);
        return;
      }
      if (cta.type === "delegate" || cta.action === "delegate") {
        toast.message("Agent queued", {
          description: cta.delegateMessage ?? cta.label,
        });
        return;
      }
      if (cta.type === "deliver") {
        toast.success(cta.label, { description: cta.description ?? "Demo action recorded" });
        return;
      }
      toast.info(cta.label);
    },
    [skillHandlers, router, openReviewFlow]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("review") === "open") {
      const t = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("agent-shell:open-review"));
      }, 300);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value: AgentShellContextValue = {
    pageId,
    snapshot,
    ctas,
    inboxCount,
    agentMode,
    chatOpen,
    chatSeed,
    inboxOpen,
    commandOpen,
    signoffOpen,
    setChatOpen,
    openChat,
    setInboxOpen,
    setCommandOpen,
    setSignoffOpen,
    handleCta,
    registerSkill,
    unregisterSkill,
    skillHandlers,
    commandItems,
    hideShell,
  };

  return <AgentShellContext.Provider value={value}>{children}</AgentShellContext.Provider>;
}

const noopShell: AgentShellContextValue = {
  pageId: "other",
  snapshot: snapshotFromAnalysis(null, "Horizon Logistics LLC"),
  ctas: [],
  inboxCount: 0,
  agentMode: "demo",
  chatOpen: false,
  chatSeed: null,
  inboxOpen: false,
  commandOpen: false,
  signoffOpen: false,
  setChatOpen: () => {},
  openChat: () => {},
  setInboxOpen: () => {},
  setCommandOpen: () => {},
  setSignoffOpen: () => {},
  handleCta: () => {},
  registerSkill: () => {},
  unregisterSkill: () => {},
  skillHandlers: null,
  commandItems: [],
  hideShell: true,
};

export function useAgentShell() {
  const ctx = useContext(AgentShellContext);
  return ctx ?? noopShell;
}

export function useAgentSkillRegistration(handlers: SkillShellHandlers | null) {
  const { registerSkill, unregisterSkill } = useAgentShell();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!handlers) {
      unregisterSkill();
      return;
    }
    registerSkill({
      skillId: handlers.skillId,
      executeLabel: handlers.executeLabel,
      isRunning: handlers.isRunning,
      onExecute: () => handlersRef.current?.onExecute(),
    });
    return () => unregisterSkill();
  }, [handlers?.skillId, handlers?.executeLabel, handlers?.isRunning, registerSkill, unregisterSkill]);
}

export function useEngagementClientSync(clientName: string) {
  useEffect(() => {
    if (clientName?.trim()) {
      localStorage.setItem(ENGAGEMENT_STORAGE_KEY, clientName.trim());
    }
  }, [clientName]);
}
