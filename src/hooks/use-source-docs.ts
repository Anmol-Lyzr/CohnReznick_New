"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SOURCE_DOCS } from "@/lib/source-documents";
import { ENGAGEMENT_NAMES } from "@/lib/customer-management";
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

    const preset = sourceDocsByClient?.[clientName];
    if (ENGAGEMENT_NAMES.includes(clientName) && !preset?.length) {
      setDocuments(DEFAULT_SOURCE_DOCS.map((filename) => ({ filename })));
      return;
    }

    if (preset?.length) {
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
        } else if (ENGAGEMENT_NAMES.includes(clientName)) {
          setDocuments(DEFAULT_SOURCE_DOCS.map((filename) => ({ filename })));
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
