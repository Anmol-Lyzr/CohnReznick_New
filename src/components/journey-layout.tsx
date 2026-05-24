"use client";

import { ReactNode, useRef, useEffect, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, FolderOpen, FileText, Brain, Cpu, CheckCircle2,
  Save, AlertTriangle, Loader2, Zap, Bot, ChevronDown, ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { JourneyState } from "@/hooks/use-journey-stream";
import { SkillOutputView } from "@/components/skill-output-view";
import { useAgentSkillRegistration } from "@/context/AgentShellProvider";
import type { SkillId } from "@/lib/customer-management";
const ICON_MAP: Record<string, React.ElementType> = {
  search: Search,
  book: BookOpen,
  folder: FolderOpen,
  file: FileText,
  brain: Brain,
  cpu: Bot,
  check: CheckCircle2,
  save: Save,
  alert: AlertTriangle,
};

function PipelineStepIcon({ icon, isLatest, isDone }: { icon: string; isLatest: boolean; isDone: boolean }) {
  const size = "w-3.5 h-3.5";
  if (isLatest) return <Loader2 className={`${size} text-primary animate-spin`} />;
  if (isDone) return <CheckCircle2 className={`${size} text-primary`} />;
  const Icon = ICON_MAP[icon] || Cpu;
  return <Icon className={`${size} text-muted-foreground`} />;
}

function getStepCategory(icon: string): string {
  if (icon === "search" || icon === "book") return "skill";
  if (icon === "folder" || icon === "file") return "knowledge";
  if (icon === "brain" || icon === "cpu") return "llm";
  if (icon === "save" || icon === "check") return "output";
  return "config";
}

const CATEGORY_BG: Record<string, string> = {
  config: "bg-primary/[0.06]",
  skill: "bg-primary/[0.06]",
  knowledge: "bg-primary/[0.04]",
  llm: "bg-primary/[0.08]",
  output: "bg-primary/[0.06]",
};

function FilePreviewInline({ filePath }: { filePath: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/agent/files?path=${encodeURIComponent(filePath)}`)
      .then(res => {
        if (!res.ok) throw new Error(`File not found (${res.status})`);
        return res.json();
      })
      .then(data => { setContent((data as { content: string }).content || ""); setLoading(false); })
      .catch(err => { setError((err as Error).message); setLoading(false); });
  }, [filePath]);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-1.5 ml-6 mr-1 rounded-lg border border-primary/15 bg-background/80 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-primary/10 bg-primary/[0.04]">
          <FileText className="w-3 h-3 text-primary/60 flex-shrink-0" />
          <span className="text-[10px] font-medium text-foreground/60 truncate">{filePath.split("/").pop()}</span>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="ml-1.5 text-[10px] text-muted-foreground">Loading...</span>
            </div>
          )}
          {error && <div className="text-[10px] text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</div>}
          {content !== null && !loading && (
            filePath.endsWith(".md") ? (
              <div className="prose prose-xs max-w-none prose-headings:text-foreground prose-headings:text-xs prose-p:text-[10px] prose-p:text-foreground/80 prose-li:text-[10px] prose-li:text-foreground/80 prose-strong:text-foreground [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-[11px] [&_table]:text-[10px] [&_p]:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface JourneyLayoutProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  skillId: string;
  state: JourneyState;
  formContent?: ReactNode;
  onExecute: () => void;
  executeLabel?: string;
  executeDisabled?: boolean;
  /** Toolbar slot — typically client name dropdown */
  toolbarSlot?: ReactNode;
  onAnomalyReviewChange?: () => void;
  onSkillReviewChange?: () => void;
}

export function JourneyLayout({
  title,
  subtitle,
  icon: TitleIcon,
  skillId,
  state,
  formContent,
  onExecute,
  executeLabel = "Execute",
  executeDisabled = false,
  toolbarSlot,
  onAnomalyReviewChange,
  onSkillReviewChange,
}: JourneyLayoutProps) {
  const skillIdTyped = skillId as SkillId;
  useAgentSkillRegistration({
    skillId: skillIdTyped,
    onExecute,
    executeLabel,
    isRunning: state.isRunning,
  });

  const activityEndRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [pipelineCollapsed, setPipelineCollapsed] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const isUserAtBottomRef = useRef(true);
  const wasRunningRef = useRef(false);

  const handleOutputScroll = () => {
    const el = outputRef.current;
    if (!el) return;
    isUserAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    if (!pipelineCollapsed && isUserAtBottomRef.current) {
      activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.activities.length, pipelineCollapsed]);

  useEffect(() => {
    if (state.output && outputRef.current) {
      if (wasRunningRef.current && isUserAtBottomRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      } else if (!wasRunningRef.current) {
        outputRef.current.scrollTop = 0;
      }
    }
  }, [state.output]);

  useEffect(() => {
    if (state.isRunning) {
      wasRunningRef.current = true;
      setPipelineCollapsed(false);
      isUserAtBottomRef.current = true;
    } else {
      wasRunningRef.current = false;
    }
  }, [state.isRunning]);

  const hasOutput = state.output.length > 0;
  const hasActivity = state.activities.length > 0;
  const skillSteps = state.activities.filter(a => a.icon === "search" || a.icon === "book");
  const knowledgeSteps = state.activities.filter(a => a.icon === "folder" || a.icon === "file");
  const useCompactLayout = !formContent;

  const executeButton = (
    <button
      onClick={onExecute}
      disabled={state.isRunning || executeDisabled}
      className={cn(
        "h-10 px-6 rounded-xl font-semibold text-sm transition-all flex-shrink-0 whitespace-nowrap",
        state.isRunning
          ? "bg-primary/20 text-primary/60 cursor-wait"
          : executeDisabled
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
      )}
    >
      {state.isRunning ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </span>
      ) : (
        executeLabel
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex-shrink-0 border-b border-border/60 bg-gradient-to-b from-primary/[0.07] via-card/30 to-transparent">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/15">
              <TitleIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">{title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 max-w-xl">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {!formContent && toolbarSlot}
            {executeButton}
          </div>
        </div>

        {formContent && (
          <div className="px-5 pb-4">
            <div className="rounded-xl border border-border/60 bg-card/90 shadow-sm px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                Parameters
              </p>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                {toolbarSlot}
                {formContent}
              </div>
            </div>
          </div>
        )}

      </header>

      {/* Output panel — full width when compact; optional source docs rail */}
      <div className="flex-1 flex flex-row min-w-0 min-h-0">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!hasActivity && !hasOutput ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-sm px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto">
                <TitleIcon className="w-8 h-8 text-primary/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                Click <strong>{executeLabel}</strong> to start{useCompactLayout ? "" : " after filling in the parameters"}.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Agent activity and the generated deliverable will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" ref={outputRef} onScroll={handleOutputScroll}>
            {hasActivity && (
              <div className="mx-5 mt-4 mb-3">
                <div className="glass-card rounded-xl overflow-hidden">
                  <button
                    onClick={() => setPipelineCollapsed(!pipelineCollapsed)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-primary/[0.03] transition-colors"
                  >
                    {pipelineCollapsed
                      ? <ChevronRight className="w-3.5 h-3.5 text-primary/60" />
                      : <ChevronDown className="w-3.5 h-3.5 text-primary/60" />
                    }
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {state.isRunning
                        ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      }
                      <span className="text-xs font-semibold text-foreground/80">
                        {state.isRunning ? "Agent Pipeline Running..." : "Agent Pipeline Complete"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                      {skillSteps.length > 0 && (
                        <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> {skillSteps.length} skills</span>
                      )}
                      {knowledgeSteps.length > 0 && (
                        <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" /> {knowledgeSteps.length} files</span>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {!pipelineCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-0.5 border-t border-border/40">
                          {state.activities.map((act, i) => {
                            const category = getStepCategory(act.icon);
                            const isLast = i === state.activities.length - 1;
                            const isDone = !isLast || !state.isRunning;
                            const hasFile = !!act.filePath;
                            const isExpanded = expandedRow === i;
                            return (
                              <div key={i}>
                                <motion.div
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.03 * Math.min(i, 10) }}
                                  onClick={hasFile ? () => setExpandedRow(isExpanded ? null : i) : undefined}
                                  className={cn(
                                    "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md mt-0.5",
                                    CATEGORY_BG[category] || "bg-primary/[0.04]",
                                    hasFile && "cursor-pointer hover:bg-primary/[0.12] transition-colors",
                                    isExpanded && "bg-primary/[0.12]"
                                  )}
                                >
                                  <PipelineStepIcon icon={act.icon} isLatest={isLast && state.isRunning} isDone={isDone} />
                                  <span className="text-[11px] text-foreground/70 leading-relaxed flex-1">{act.action}</span>
                                  {hasFile && (
                                    <ChevronDown className={cn("w-3 h-3 text-primary/40 transition-transform duration-200", isExpanded && "rotate-180")} />
                                  )}
                                </motion.div>
                                <AnimatePresence>
                                  {isExpanded && act.filePath && <FilePreviewInline filePath={act.filePath} />}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                          <div ref={activityEndRef} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {hasOutput && (
              <div className="px-6 pb-6">
                {state.agentMode && (
                  <span
                    className={cn(
                      "inline-block mb-3 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      state.analysis?._agent_meta || state.analysis?._agent_v2_raw || state.agentMode === "live"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {state.analysis?._agent_meta || state.analysis?._agent_v2_raw
                      ? "Live Lyzr Agent"
                      : state.agentMode === "live"
                        ? "Live Lyzr Agent"
                        : "PoC sample"}
                  </span>
                )}
                {state.analysis ? (
                  <SkillOutputView
                    skill={skillId}
                    analysis={state.analysis}
                    agentMode={state.agentMode}
                    onAnomalyReviewChange={onAnomalyReviewChange}
                    onSkillReviewChange={onSkillReviewChange ?? onAnomalyReviewChange}
                  />
                ) : (
                  <div className="skill-output-markdown prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground prose-th:bg-primary/10 prose-th:text-foreground prose-th:font-bold prose-th:border prose-th:border-border/50 prose-td:border prose-td:border-border/40 prose-table:border-collapse prose-table:border-2 prose-table:border-border/60">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.output}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {state.error && (
              <div className="p-4 mx-5 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">{state.error}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

import { toolbarControlClass } from "@/lib/toolbar-form";

export { toolbarControlClass } from "@/lib/toolbar-form";

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  hint?: string;
  layout?: "vertical" | "toolbar";
}

export function FormField({
  label,
  required,
  children,
  className,
  hint,
  layout = "toolbar",
}: FormFieldProps) {
  return (
    <div
      className={cn(
        layout === "toolbar"
          ? "flex min-w-[180px] flex-1 max-w-md flex-col gap-1.5"
          : "w-full space-y-1.5",
        className
      )}
    >
      <label className="text-[11px] font-semibold text-foreground/75 leading-none h-[14px] flex items-center">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="min-h-9 shrink-0">{children}</div>
      {layout === "toolbar" && (
        <p
          className={cn(
            "h-[14px] text-[10px] leading-[14px] truncate",
            hint ? "text-muted-foreground/80" : "invisible"
          )}
          title={hint}
          aria-hidden={!hint}
        >
          {hint ?? "\u00a0"}
        </p>
      )}
      {layout !== "toolbar" && hint && (
        <p className="text-[10px] text-muted-foreground/80 truncate leading-tight" title={hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(toolbarControlClass, className)} {...props} />;
}

export function FormSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(toolbarControlClass, "cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

interface ToolbarFileInputProps {
  label?: string;
  accept?: string;
  onChange: (file: File | undefined) => void;
  hint?: string;
  className?: string;
}

export function ToolbarFileInput({
  label = "Trial balance file",
  accept,
  onChange,
  hint,
  className,
}: ToolbarFileInputProps) {
  const inputId = useId();

  return (
    <FormField label={label} hint={hint} className={className}>
      <div className="flex h-full w-full min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-2 shadow-sm transition-colors hover:border-primary/30 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40">
        <label
          htmlFor={inputId}
          className="shrink-0 cursor-pointer rounded-md bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          Browse
        </label>
        <span className="toolbar-file-name min-w-0 flex-1 truncate text-xs text-muted-foreground">
          No file chosen
        </span>
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(file);
            const el = e.target.parentElement?.querySelector(".toolbar-file-name");
            if (el) el.textContent = file?.name ?? "No file chosen";
          }}
        />
      </div>
    </FormField>
  );
}

interface CheckboxGroupProps { options: string[]; selected: string[]; onChange: (s: string[]) => void }

export function CheckboxGroup({ options, selected, onChange }: CheckboxGroupProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={e => {
              if (e.target.checked) onChange([...selected, opt]);
              else onChange(selected.filter(s => s !== opt));
            }}
            className="rounded border-border/50 text-primary focus:ring-primary/30"
          />
          <span className="text-xs text-foreground/70">{opt}</span>
        </label>
      ))}
    </div>
  );
}

