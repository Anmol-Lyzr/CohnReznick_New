"use client";

import { useState } from "react";
import { FolderOpen, FileText, Database, GitBranch, ChevronRight, ChevronDown } from "lucide-react";
interface FileNode {
  name: string;
  type: "file" | "folder";
  size?: string;
  children?: FileNode[];
}

const FILE_TREE: FileNode[] = [
  {
    name: "identity/",
    type: "folder",
    children: [
      { name: "SOUL.md", type: "file", size: "2.1 KB" },
      { name: "RULES.md", type: "file", size: "3.4 KB" },
    ],
  },
  {
    name: "skills/",
    type: "folder",
    children: [
      { name: "trial-balance-ingestion.md", type: "file", size: "4.0 KB" },
      { name: "anomaly-detection.md", type: "file", size: "3.8 KB" },
      { name: "driver-analysis.md", type: "file", size: "3.6 KB" },
      { name: "follow-up-questions.md", type: "file", size: "3.2 KB" },
      { name: "issue-tracker.md", type: "file", size: "2.9 KB" },
      { name: "report-drafting.md", type: "file", size: "4.5 KB" },
    ],
  },
  {
    name: "knowledge/docs/",
    type: "folder",
    children: [
      { name: "diligence-methodology.md", type: "file", size: "5.2 KB" },
    ],
  },
  {
    name: "workspace/advisory/",
    type: "folder",
    children: [
      { name: "engagement-brief.md", type: "file", size: "2.8 KB" },
      { name: "trial-balance-summary.md", type: "file", size: "6.1 KB" },
      { name: "anomaly-findings.md", type: "file", size: "4.8 KB" },
      { name: "driver-analysis.md", type: "file", size: "5.4 KB" },
      { name: "follow-up-questions.md", type: "file", size: "3.9 KB" },
      { name: "issue-log.md", type: "file", size: "3.2 KB" },
      { name: "diligence-report-draft.md", type: "file", size: "7.8 KB" },
    ],
  },
  {
    name: "templates/",
    type: "folder",
    children: [
      { name: "CohnReznick_Diligence_Report_Template.docx", type: "file", size: "124 KB" },
    ],
  },
];

const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "identity/": Database,
  "skills/": GitBranch,
  "knowledge/docs/": Database,
  "workspace/advisory/": FolderOpen,
  "templates/": FileText,
};

function FileRow({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0);
  const FolderIcon = FOLDER_ICONS[node.name] ?? FolderOpen;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-lg hover:bg-white/40 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          <FolderIcon className="w-3.5 h-3.5 text-primary/60" />
          <span className="text-xs font-mono text-foreground/80">{node.name}</span>
        </button>
        {open && node.children?.map((child) => <FileRow key={child.name} node={child} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/40 transition-colors"
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      <FileText className="w-3.5 h-3.5 text-muted-foreground/50" />
      <span className="text-xs font-mono text-foreground/70 flex-1">{node.name}</span>
      {node.size && <span className="text-[10px] text-muted-foreground/40">{node.size}</span>}
    </div>
  );
}

export default function FileSystem() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <FolderOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">File System</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Agent workspace — skills, diligence knowledge, engagement source files, and report templates
        </p>
      </div>
      <div className="glass-card rounded-xl p-4">
        {FILE_TREE.map((node) => (
          <FileRow key={node.name} node={node} />
        ))}
      </div>
    </div>
  );
}
