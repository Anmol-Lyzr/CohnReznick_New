"use client";

import { SourceDocChip } from "@/components/source-doc-chip";
import type { SourceDocRef } from "@/hooks/use-source-docs";

export function SourceDocsPanel({
  docs,
  clientName,
}: {
  docs: SourceDocRef[] | string[];
  clientName?: string;
}) {
  const refs: SourceDocRef[] = docs.map((d) =>
    typeof d === "string" ? { filename: d } : d
  );
  if (refs.length === 0) return null;

  return (
    <aside className="w-[148px] flex-shrink-0 border-l border-border/50 bg-sidebar/90 overflow-y-auto min-h-0 surface-panel">
      <div className="p-3">
        <h3 className="text-[11px] font-bold text-primary tracking-tight mb-3">Source Docs</h3>
        <div className="flex flex-col gap-1.5">
          {refs.map((ref) => (
            <SourceDocChip
              key={ref.id ?? ref.filename}
              doc={ref.filename}
              documentId={ref.id}
              clientName={clientName}
              className="w-full max-w-full justify-start"
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
