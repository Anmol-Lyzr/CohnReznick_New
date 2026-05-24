"use client";

import { useEffect, useState } from "react";
import { getSourceDocsForEngagement } from "@/lib/customer-management";
import { filterEngagementSourceDocs } from "@/lib/source-documents";
import type { SourceDocumentMeta } from "@/lib/mongodb/types";

export interface SourceDocRef {
  filename: string;
  id?: string;
}

export function useSourceDocs(clientName: string, sourceDocsByClient?: Record<string, string[]>) {
  const [documents, setDocuments] = useState<SourceDocRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientName) {
      setDocuments([]);
      return;
    }

    const profileDocs = filterEngagementSourceDocs(getSourceDocsForEngagement(clientName));
    const preset = filterEngagementSourceDocs(sourceDocsByClient?.[clientName] ?? profileDocs);

    if (preset.length > 0) {
      setDocuments(preset.map((filename) => ({ filename })));
    }

    setLoading(true);
    fetch(`/api/store/documents?clientName=${encodeURIComponent(clientName)}`)
      .then((res) => (res.ok ? res.json() : { documents: [] }))
      .then((data: { documents?: SourceDocumentMeta[] }) => {
        const fromDb = (data.documents ?? []).map((d) => ({
          filename: d.filename,
          id: d.id,
        }));
        const filenames = new Set<string>();
        const merged: SourceDocRef[] = [];
        for (const ref of [...fromDb, ...(preset ?? []).map((f) => ({ filename: f }))]) {
          if (filenames.has(ref.filename)) continue;
          filenames.add(ref.filename);
          merged.push(ref);
        }
        if (merged.length > 0) {
          setDocuments(merged);
        } else {
          setDocuments([]);
        }
      })
      .catch(() => {
        if (preset?.length) {
          setDocuments(preset.map((filename) => ({ filename })));
        }
      })
      .finally(() => setLoading(false));
  }, [clientName, sourceDocsByClient]);

  return { documents, filenames: documents.map((d) => d.filename), loading };
}
