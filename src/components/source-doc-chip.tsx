"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSourceDocOpenable, resolveSourceDocHref } from "@/lib/source-documents";

export function SourceDocChip({
  doc,
  documentId,
  clientName,
  className,
}: {
  doc: string;
  documentId?: string;
  clientName?: string;
  className?: string;
}) {
  const href = resolveSourceDocHref(doc, { documentId, clientName });
  const openable = isSourceDocOpenable(doc, { documentId, clientName });
  const chipClass = cn(
    "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md",
    openable
      ? "bg-primary/5 text-primary hover:bg-primary/15 transition-colors cursor-pointer"
      : "bg-primary/5 text-primary/80",
    className
  );

  const inner = (
    <>
      <FileText className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="truncate max-w-[120px]">{doc}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" className={chipClass} title={`Open ${doc}`}>
        {inner}
      </Link>
    );
  }

  return (
    <span className={chipClass} title={doc}>
      {inner}
    </span>
  );
}
