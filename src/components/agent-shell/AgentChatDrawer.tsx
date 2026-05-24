"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Bot, Loader2 } from "lucide-react";
import { useAgentShell } from "@/context/AgentShellProvider";
import { useChatStream } from "@/hooks/use-chat-stream";

export function AgentChatDrawer() {
  const { chatOpen, setChatOpen, snapshot, chatSeed } = useAgentShell();
  const [input, setInput] = useState("");
  const { messages, isStreaming, sendMessage } = useChatStream();

  const seedSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!chatOpen || !chatSeed || isStreaming) return;
    if (seedSentRef.current === chatSeed) return;
    seedSentRef.current = chatSeed;
    const scoped = `[${snapshot.clientName}] ${chatSeed}`;
    void sendMessage(scoped);
  }, [chatOpen, chatSeed, isStreaming, snapshot.clientName, sendMessage]);

  if (!chatOpen) return null;

  const send = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    const scoped = `[${snapshot.clientName}] ${text}`;
    void sendMessage(scoped);
  };

  const displayMessages =
    messages.length > 0
      ? messages
      : [
          {
            id: "welcome",
            role: "agent" as const,
            content: `I'm your diligence agent for ${snapshot.clientName}. Ask about anomalies, drivers, or next steps in the workflow.`,
          },
        ];

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setChatOpen(false)} />
      <aside className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-card border-l border-border/60 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Ask agent</h2>
          </div>
          <button type="button" onClick={() => setChatOpen(false)} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {displayMessages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === "user"
                  ? "ml-8 rounded-lg bg-primary/10 px-3 py-2 text-xs whitespace-pre-wrap"
                  : "mr-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap"
              }
            >
              {msg.content}
            </div>
          ))}
          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
            </div>
          )}
        </div>
        <div className="p-3 border-t border-border/50 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about trends, drivers, or findings…"
            className="flex-1 text-xs rounded-lg border border-border/60 px-3 py-2 bg-background"
          />
          <button
            type="button"
            onClick={send}
            disabled={isStreaming || !input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
