import { canLoadPoCSample } from "@/lib/client-sample-guard";
import type { SkillId } from "@/lib/customer-management";
import { SKILL_LABELS } from "@/lib/customer-management";
import { CAPABILITIES, INTEGRATIONS } from "@/lib/cohnreznick-metadata";
import type { EngagementSnapshot } from "@/lib/agent-engagement-state";
import { skillHref } from "@/lib/agent-engagement-state";

export type AgentCtaType = "run" | "review" | "navigate" | "delegate" | "deliver";

export type PageId =
  | "dashboard"
  | "customer-management"
  | "trial-balance-ingestion"
  | "anomaly-detection"
  | "driver-analysis"
  | "follow-up-questions"
  | "issue-tracker"
  | "report-drafting"
  | "skills-library"
  | "integrations"
  | "architecture"
  | "files"
  | "settings"
  | "documents"
  | "other";

export interface AgentCta {
  id: string;
  type: AgentCtaType;
  label: string;
  description?: string;
  href?: string;
  skillId?: SkillId;
  primary?: boolean;
  /** run = trigger skill execute; review = open inbox/modal; delegate = toast stub */
  action?: "execute" | "review" | "inbox" | "chat" | "delegate" | "signoff";
  delegateMessage?: string;
}

const SKILL_PAGE_IDS: PageId[] = [
  "trial-balance-ingestion",
  "anomaly-detection",
  "driver-analysis",
  "follow-up-questions",
  "issue-tracker",
  "report-drafting",
];

export function pathnameToPageId(pathname: string): PageId {
  if (pathname === "/") return "dashboard";
  if (pathname.includes("/customer-management")) return "customer-management";
  if (pathname.includes("/trial-balance-ingestion")) return "trial-balance-ingestion";
  if (pathname.includes("/anomaly-detection")) return "anomaly-detection";
  if (pathname.includes("/driver-analysis")) return "driver-analysis";
  if (pathname.includes("/follow-up-questions")) return "follow-up-questions";
  if (pathname.includes("/issue-tracker")) return "issue-tracker";
  if (pathname.includes("/report-drafting")) return "report-drafting";
  if (pathname === "/tools/skills") return "skills-library";
  if (pathname === "/tools") return "integrations";
  if (pathname.includes("/architecture")) return "architecture";
  if (pathname.includes("/files")) return "files";
  if (pathname.includes("/settings")) return "settings";
  if (pathname.startsWith("/documents")) return "documents";
  return "other";
}

export function pageIdToSkillId(pageId: PageId): SkillId | null {
  if (SKILL_PAGE_IDS.includes(pageId)) return pageId as SkillId;
  return null;
}

export function getNextStepCta(snapshot: EngagementSnapshot): AgentCta | null {
  if (!snapshot.nextSkillId) return null;
  const client = snapshot.clientName;

  if (snapshot.blockerMessage && snapshot.pendingReviewCount > 0) {
    return {
      id: "next-review",
      type: "review",
      label: `Review ${snapshot.pendingReviewCount} pending`,
      description: snapshot.blockerMessage,
      href: skillHref("anomaly-detection", client, { review: "open" }),
      skillId: "anomaly-detection",
      primary: true,
      action: "review",
    };
  }

  const skill = snapshot.nextSkillId;
  const labels: Record<SkillId, string> = {
    "trial-balance-ingestion": "Upload & ingest trial balance",
    "anomaly-detection": "Run anomaly detection",
    "driver-analysis": "Analyze drivers",
    "follow-up-questions": "Generate follow-up questions",
    "issue-tracker": "Update issue log",
    "report-drafting": "Draft diligence report",
  };

  return {
    id: "next-step",
    type: snapshot.pipelineStep === 7 && snapshot.pendingReviewCount === 0 ? "navigate" : "run",
    label: labels[skill],
    description: snapshot.blockerMessage,
    href: skillHref(skill, client),
    skillId: skill,
    primary: true,
    action: SKILL_PAGE_IDS.includes(skill as PageId) ? "execute" : undefined,
  };
}

function baseSkillCtAs(pageId: PageId, snapshot: EngagementSnapshot): AgentCta[] {
  const client = snapshot.clientName;
  const q = encodeURIComponent(client);

  const shared: AgentCta[] = [
    {
      id: "view-files",
      type: "navigate",
      label: "View source files",
      href: "/tools/files",
    },
    {
      id: "open-pipeline",
      type: "navigate",
      label: "Client pipeline",
      href: `/tools/skills/customer-management?client=${q}`,
    },
  ];

  const map: Partial<Record<PageId, AgentCta[]>> = {
    "trial-balance-ingestion": [
      {
        id: "run-ingest",
        type: "run",
        label: "Ingest & Normalize",
        primary: true,
        action: "execute",
        skillId: "trial-balance-ingestion",
      },
      ...(canLoadPoCSample(client)
        ? [
            {
              id: "sample-tb",
              type: "navigate" as const,
              label: "Use sample TB",
              href: skillHref("trial-balance-ingestion", client, { sample: "true" }),
            },
          ]
        : []),
      {
        id: "attach-workpapers",
        type: "delegate",
        label: "Map workpapers",
        delegateMessage: "Agent queued: map supporting schedules to account lines",
        action: "delegate",
      },
      {
        id: "proceed-anomaly",
        type: "navigate",
        label: "Run detection →",
        href: skillHref("anomaly-detection", client),
        skillId: "anomaly-detection",
      },
    ],
    "anomaly-detection": [
      {
        id: "run-detection",
        type: "run",
        label: "Run Detection",
        primary: true,
        action: "execute",
        skillId: "anomaly-detection",
      },
      {
        id: "review-inbox",
        type: "review",
        label:
          snapshot.pendingReviewCount > 0
            ? `Review ${snapshot.pendingReviewCount} findings`
            : "Open review inbox",
        action: "review",
        primary: snapshot.pendingReviewCount > 0,
      },
      {
        id: "bulk-high",
        type: "review",
        label: "Validate all HIGH",
        action: "review",
        description: "Bulk approve high-severity movements",
      },
      {
        id: "to-drivers",
        type: "navigate",
        label: "Driver analysis →",
        href: skillHref("driver-analysis", client),
      },
      {
        id: "explain",
        type: "delegate",
        label: "Explain movement",
        action: "chat",
        delegateMessage: "Why did this account move in the flagged period?",
      },
    ],
    "driver-analysis": [
      {
        id: "run-drivers",
        type: "run",
        label: "Analyze Drivers",
        primary: true,
        action: "execute",
        skillId: "driver-analysis",
      },
      ...(snapshot.pendingReviewCount > 0
        ? [
            {
              id: "gate-anomaly",
              type: "navigate" as const,
              label: "Complete anomaly review first",
              href: skillHref("anomaly-detection", client, { review: "open" }),
              primary: true,
            },
          ]
        : [
            {
              id: "validate-high",
              type: "review" as const,
              label: "Validate all HIGH",
              action: "review" as const,
            },
          ]),
      {
        id: "challenge",
        type: "delegate",
        label: "Challenge driver",
        action: "delegate",
        delegateMessage: "Agent queued: find contradicting accounts for this narrative",
      },
      {
        id: "to-questions",
        type: "navigate",
        label: "Generate questions →",
        href: skillHref("follow-up-questions", client),
      },
    ],
    "follow-up-questions": [
      {
        id: "run-questions",
        type: "run",
        label: "Generate Questions",
        primary: true,
        action: "execute",
        skillId: "follow-up-questions",
      },
      { id: "export-agenda", type: "deliver", label: "Export agenda", action: "delegate", delegateMessage: "Use Export agenda in output panel" },
      {
        id: "refine-tone",
        type: "delegate",
        label: "Refine for mgmt call",
        action: "delegate",
        delegateMessage: "Agent queued: rewrite questions for management discussion (less technical)",
      },
      {
        id: "to-issues",
        type: "navigate",
        label: "Issue tracker →",
        href: skillHref("issue-tracker", client),
      },
    ],
    "issue-tracker": [
      {
        id: "run-tracker",
        type: "run",
        label: "Update Issue Log",
        primary: true,
        action: "execute",
        skillId: "issue-tracker",
      },
      { id: "escalate-high", type: "review", label: "Escalate all HIGH", action: "review" },
      {
        id: "draft-email",
        type: "delegate",
        label: "Draft CFO email",
        action: "delegate",
        delegateMessage: "Agent queued: draft management response request",
      },
      {
        id: "to-report",
        type: "navigate",
        label: "Draft report →",
        href: skillHref("report-drafting", client),
      },
    ],
    "report-drafting": [
      {
        id: "run-report",
        type: "run",
        label: "Draft Report",
        primary: true,
        action: "execute",
        skillId: "report-drafting",
      },
      {
        id: "signoff",
        type: "review",
        label: "Final sign-off",
        action: "signoff",
        primary: snapshot.progress.report,
      },
      {
        id: "word-template",
        type: "deliver",
        label: "Populate Word template",
        action: "delegate",
        delegateMessage: "Agent queued: populate firm report template (demo)",
      },
      {
        id: "back-anomaly",
        type: "navigate",
        label: "Review anomalies",
        href: skillHref("anomaly-detection", client),
      },
    ],
  };

  return [...(map[pageId] ?? []), ...shared];
}

function pageSpecificCtAs(pageId: PageId, snapshot: EngagementSnapshot): AgentCta[] {
  const client = snapshot.clientName;
  const q = encodeURIComponent(client);

  switch (pageId) {
    case "dashboard": {
      const next = getNextStepCta(snapshot);
      const items: AgentCta[] = [];
      if (next) items.push(next);
      items.push(
        {
          id: "morning-brief",
          type: "delegate",
          label: "Morning briefing",
          action: "delegate",
          delegateMessage: "Agent summarizing overnight diligence activity…",
        },
        {
          id: "open-inbox",
          type: "review",
          label: snapshot.pendingReviewCount > 0 ? `${snapshot.pendingReviewCount} in inbox` : "Review inbox",
          action: "inbox",
          href: skillHref("anomaly-detection", client, { review: "open" }),
        },
        {
          id: "pipeline",
          type: "navigate",
          label: "Client pipeline",
          href: "/tools/skills/customer-management",
        }
      );
      return items;
    }

    case "customer-management":
      return [
        {
          id: "new-engagement",
          type: "navigate",
          label: "Start diligence",
          href: skillHref("trial-balance-ingestion", client),
          primary: true,
        },
        {
          id: "run-next",
          type: "run",
          label: snapshot.nextSkillId ? `Run ${SKILL_LABELS[snapshot.nextSkillId]}` : "Run next skill",
          href: snapshot.nextSkillId ? skillHref(snapshot.nextSkillId, client) : undefined,
          primary: !!snapshot.nextSkillId,
        },
        {
          id: "export-pipeline",
          type: "deliver",
          label: "Export pipeline CSV",
          action: "delegate",
          delegateMessage: "Pipeline export queued (demo)",
        },
        {
          id: "benchmark",
          type: "delegate",
          label: "Benchmark DSO",
          action: "delegate",
          delegateMessage: "Agent queued: compare AR days across engagements",
        },
      ];

    case "skills-library":
      return CAPABILITIES.slice(0, 4).map((c) => ({
        id: `skill-${c.id}`,
        type: "navigate" as const,
        label: c.name,
        href: `${c.href}?client=${q}`,
        description: c.description.slice(0, 60) + "…",
      }));

    case "integrations":
      return [
        ...INTEGRATIONS.slice(0, 3).map((i) => ({
          id: `int-${i.id}`,
          type: "run" as const,
          label: `Connect ${i.name}`,
          action: "delegate" as const,
          delegateMessage: `Agent verifying ${i.name} access (demo)`,
        })),
        {
          id: "test-conn",
          type: "delegate",
          label: "Test all connections",
          action: "delegate",
          delegateMessage: "Agent: verify read access to connected sources",
        },
      ];

    case "architecture":
      return [
        {
          id: "health-check",
          type: "delegate",
          label: "Layer health check",
          action: "delegate",
          delegateMessage: "Verifying Lyzr agent + Azure isolated deployment (demo)",
          primary: true,
        },
        {
          id: "skills-from-arch",
          type: "navigate",
          label: "Open skills library",
          href: "/tools/skills",
        },
        {
          id: "compliance",
          type: "review",
          label: "Compliance posture",
          action: "delegate",
          delegateMessage: "Opening attestation summary (demo)",
        },
      ];

    case "files":
      return [
        {
          id: "open-analysis",
          type: "navigate",
          label: "Open in anomaly detection",
          href: skillHref("anomaly-detection", client),
          primary: true,
        },
        {
          id: "summarize-file",
          type: "delegate",
          label: "Summarize selected file",
          action: "chat",
        },
        {
          id: "refresh-workspace",
          type: "run",
          label: "Refresh workspace",
          action: "delegate",
          delegateMessage: "Refreshing agent file workspace…",
        },
      ];

    case "settings":
      return [
        {
          id: "review-policy",
          type: "review",
          label: "Review policy",
          action: "delegate",
          delegateMessage: "All HIGH findings require Admin approval (demo policy)",
        },
        {
          id: "audit-log",
          type: "navigate",
          label: "Audit log",
          href: "/tools/skills/customer-management",
        },
        {
          id: "assign-owner",
          type: "deliver",
          label: "Assign engagement owner",
          action: "delegate",
          delegateMessage: "Route engagement to reviewer (demo)",
        },
      ];

    case "documents":
      return [
        {
          id: "ask-doc",
          type: "delegate",
          label: "Ask about this doc",
          action: "chat",
          primary: true,
        },
        {
          id: "cite-finding",
          type: "review",
          label: "Cite in finding",
          action: "delegate",
          delegateMessage: "Link document section to issue log entry (demo)",
        },
        {
          id: "share-doc",
          type: "deliver",
          label: "Share with reviewer",
          action: "delegate",
          delegateMessage: "Share link queued for advisory team (demo)",
        },
      ];

    default:
      return [];
  }
}

export function getCtAsForPage(pageId: PageId, snapshot: EngagementSnapshot): AgentCta[] {
  const skillId = pageIdToSkillId(pageId);
  const next = getNextStepCta(snapshot);

  let ctas: AgentCta[] = [];
  if (skillId) {
    ctas = baseSkillCtAs(pageId, snapshot);
  } else {
    ctas = pageSpecificCtAs(pageId, snapshot);
  }

  if (next && !ctas.some((c) => c.id === next.id)) {
    ctas = [next, ...ctas];
  }

  const seen = new Set<string>();
  const deduped: AgentCta[] = [];
  for (const c of ctas) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    deduped.push(c);
  }

  const primary = deduped.filter((c) => c.primary);
  const rest = deduped.filter((c) => !c.primary);
  return [...primary, ...rest].slice(0, 8);
}

export function getExecuteLabelForSkill(skillId: SkillId): string {
  const labels: Record<SkillId, string> = {
    "trial-balance-ingestion": "Ingest & Normalize",
    "anomaly-detection": "Run Detection",
    "driver-analysis": "Analyze Drivers",
    "follow-up-questions": "Generate Questions",
    "issue-tracker": "Update Issue Log",
    "report-drafting": "Draft Report",
  };
  return labels[skillId];
}

export function commandPaletteItems(
  snapshot: EngagementSnapshot,
  storeClients: string[]
): { id: string; label: string; href?: string; action?: AgentCta["action"]; group: string }[] {
  const items: { id: string; label: string; href?: string; action?: AgentCta["action"]; group: string }[] = [];

  const next = getNextStepCta(snapshot);
  if (next?.href) {
    items.push({ id: "cmd-next", label: next.label, href: next.href, group: "Suggested" });
  }

  for (const client of storeClients.slice(0, 5)) {
    items.push({
      id: `cmd-anomaly-${client}`,
      label: `Run anomaly — ${client}`,
      href: skillHref("anomaly-detection", client),
      group: "Engagements",
    });
  }

  for (const cap of CAPABILITIES) {
    items.push({
      id: `cmd-${cap.id}`,
      label: cap.name,
      href: `${cap.href}?client=${encodeURIComponent(snapshot.clientName)}`,
      group: "Skills",
    });
  }

  items.push(
    { id: "cmd-inbox", label: "Open review inbox", action: "inbox", group: "Actions" },
    { id: "cmd-chat", label: "Ask agent", action: "chat", group: "Actions" },
    { id: "cmd-pipeline", label: "Customer pipeline", href: "/tools/skills/customer-management", group: "Navigate" }
  );

  return items;
}
