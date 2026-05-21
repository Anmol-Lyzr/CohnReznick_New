import { useState, useRef, useCallback } from "react";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";

export type MessageRole = "user" | "agent";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

export interface ChatEvent {
  type: string;
  data: string | Record<string, unknown>;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function useChatStream(onStructuredAnalysis?: (data: AdvisoryAnalysisOutput) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeEvents, setActiveEvents] = useState<ChatEvent[]>([]);
  const [activeFiles, setActiveFiles] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<{ phase: number; name: string; description: string } | null>(null);
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [detectedClient, setDetectedClient] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessageId = Math.random().toString(36).substring(7);
    const agentMessageId = Math.random().toString(36).substring(7);

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMessageId, role: "user", content },
    ];
    setMessages(newMessages);
    setIsStreaming(true);
    setActiveEvents([]);
    setActiveFiles([]);
    setCurrentPhase(null);
    setDetectedSkills([]);
    setDetectedClient(null);

    setMessages((prev) => [
      ...prev,
      { id: agentMessageId, role: "agent", content: "" },
    ]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role === "agent" ? "assistant" : "user",
            content: m.content
          })),
          sessionId: sessionIdRef.current
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Network response was not ok");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          let eventType = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6);
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === "delta") {
              const chunk = data.text || "";
              setMessages(prev => prev.map(msg =>
                msg.id === agentMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              ));
            } else if (eventType === "structured") {
              const analysis = (data as { analysis?: AdvisoryAnalysisOutput }).analysis;
              if (analysis) {
                onStructuredAnalysis?.(analysis);
              }
            } else if (eventType === "done") {
              // stream complete
            } else if (eventType === "error") {
              const errorMsg = data.error || "An error occurred while processing your request.";
              setMessages(prev => prev.map(msg =>
                msg.id === agentMessageId
                  ? { ...msg, content: msg.content || errorMsg }
                  : msg
              ));
            } else if (eventType === "phase") {
              setCurrentPhase({ phase: data.phase, name: data.name, description: data.description });
              const evt: ChatEvent = {
                type: "phase",
                data: data.name,
                timestamp: Date.now(),
                meta: { phase: data.phase, name: data.name, description: data.description },
              };
              setActiveEvents(prev => [...prev, evt]);
            } else if (eventType === "skill_detect") {
              if (data.skills) setDetectedSkills(data.skills);
              const evt: ChatEvent = {
                type: "skill_detect",
                data: data.action,
                timestamp: Date.now(),
                meta: { skills: data.skills, reasoning: data.reasoning, action: data.action },
              };
              setActiveEvents(prev => [...prev, evt]);
            } else if (eventType === "client_detect") {
              if (data.client) setDetectedClient(data.clientDisplay || data.client);
              const evt: ChatEvent = {
                type: "client_detect",
                data: data.action,
                timestamp: Date.now(),
                meta: { client: data.client, clientDisplay: data.clientDisplay, action: data.action },
              };
              setActiveEvents(prev => [...prev, evt]);
            } else if (eventType === "integration_check") {
              const evt: ChatEvent = {
                type: "integration_check",
                data: data.integration,
                timestamp: Date.now(),
                meta: {
                  integration: data.integration,
                  action: data.action,
                  status: data.status,
                  available: data.available,
                  requires_setup: data.requires_setup,
                },
              };
              setActiveEvents(prev => [...prev, evt]);
            } else if (eventType === "pipeline_ready" || eventType === "pipeline_start" || eventType === "llm_start") {
              const evt: ChatEvent = {
                type: eventType,
                data: data.action,
                timestamp: Date.now(),
                meta: { ...data, action: data.action },
              };
              setActiveEvents(prev => [...prev, evt]);
            } else if (eventType === "skill_execute") {
              const evt: ChatEvent = {
                type: "skill_execute",
                data: data.skill,
                timestamp: Date.now(),
                meta: { skill: data.skill, action: data.action, steps: data.steps, step_count: data.step_count },
              };
              setActiveEvents(prev => [...prev, evt]);
            } else {
              const fileName = data.file || data.skill || data.action || eventType;
              const evt: ChatEvent = {
                type: eventType,
                data: fileName,
                timestamp: Date.now(),
                meta: {
                  action: data.action || data.skill || fileName,
                  preview: data.preview || undefined,
                  path: data.path || data.file,
                  status: data.status,
                  size: data.size,
                  category: data.category,
                  skill: data.skill,
                  steps: data.steps,
                  integrations: data.integrations,
                  isPrimary: data.isPrimary,
                  files: data.files,
                  client: data.client,
                }
              };
              setActiveEvents(prev => [...prev, evt]);

              if (eventType === "file_fetch") {
                const name = data.file || data.path || "";
                const baseName = name.split("/").pop() || name;
                setActiveFiles(prev => {
                  if (!prev.includes(baseName)) return [...prev, baseName];
                  return prev;
                });
              }
            }
          } catch {
            // skip parse errors
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Stream aborted");
      } else {
        console.error("Chat stream error:", error);
        setMessages(prev => prev.map(msg =>
          msg.id === agentMessageId && !msg.content
            ? { ...msg, content: "Sorry, I encountered an error connecting to the agent engine." }
            : msg
        ));
      }
    } finally {
      setIsStreaming(false);
      setCurrentPhase(null);
    }
  }, [messages, onStructuredAnalysis]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return { messages, isStreaming, activeEvents, activeFiles, currentPhase, detectedSkills, detectedClient, sendMessage, stopStream };
}
