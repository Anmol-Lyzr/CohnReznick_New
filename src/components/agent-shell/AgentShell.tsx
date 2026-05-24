"use client";

import { AgentContextBar } from "@/components/agent-shell/AgentContextBar";
import { AgentActionRail } from "@/components/agent-shell/AgentActionRail";
import { AgentInboxDrawer } from "@/components/agent-shell/AgentInboxDrawer";
import { AgentChatDrawer } from "@/components/agent-shell/AgentChatDrawer";
import { AgentCommandPalette } from "@/components/agent-shell/AgentCommandPalette";
import { AgentSignoffModal } from "@/components/agent-shell/AgentSignoffModal";

export function AgentShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AgentContextBar />
      <AgentActionRail />
      {children}
      <AgentInboxDrawer />
      <AgentChatDrawer />
      <AgentCommandPalette />
      <AgentSignoffModal />
    </>
  );
}
