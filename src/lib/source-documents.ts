/** Shared PoC design document — shown for every engagement */
export const POC_SOURCE_DOCUMENT_FILENAME = "CohnReznick_Advisory_Agent_PoC.pdf";

export const POC_DOCUMENT_SLUG = "CohnReznick_Advisory_Agent_PoC";

export const POC_DOCUMENT_API_ID = "poc-design-doc";

/** PoC design doc — not listed on engagement source docs */
export const DEFAULT_SOURCE_DOCS = [POC_SOURCE_DOCUMENT_FILENAME] as const;

export function isExcludedEngagementSourceDoc(filename: string): boolean {
  return (
    filename === POC_SOURCE_DOCUMENT_FILENAME ||
    filename === POC_DOCUMENT_SLUG ||
    filename === "CohnReznick_Advisory_Agent_PoC.md"
  );
}

export function filterEngagementSourceDocs(filenames: string[]): string[] {
  return [...new Set(filenames.filter((f) => f && !isExcludedEngagementSourceDoc(f)))];
}

/** PoC trial balance files served from public/documents/trial-balance */
export const STATIC_TRIAL_BALANCE_FILES = new Set([
  "TB_Horizon_FY25.csv",
  "TB_Summit_Q1-26.xlsx",
  "TB_NorthBridge_36mo.xlsx",
]);

/** @deprecated Use DEFAULT_SOURCE_DOCS — only the PoC advisory doc is listed */
export function mergeSourceDocs(): string[] {
  return [...DEFAULT_SOURCE_DOCS];
}

export function resolveSourceDocHref(
  filename: string,
  options?: { documentId?: string; clientName?: string }
): string | undefined {
  if (options?.documentId) {
    return `/documents/stored/${options.documentId}`;
  }
  if (
    filename === POC_SOURCE_DOCUMENT_FILENAME ||
    filename === POC_DOCUMENT_SLUG ||
    filename === "CohnReznick_Advisory_Agent_PoC.md"
  ) {
    return `/documents/${POC_DOCUMENT_SLUG}`;
  }
  if (STATIC_TRIAL_BALANCE_FILES.has(filename)) {
    return `/documents/trial-balance/${encodeURIComponent(filename)}`;
  }
  if (options?.clientName) {
    return `/documents/stored?client=${encodeURIComponent(options.clientName)}&name=${encodeURIComponent(filename)}`;
  }
  return undefined;
}

export function isSourceDocOpenable(
  filename: string,
  options?: { documentId?: string; clientName?: string }
): boolean {
  return resolveSourceDocHref(filename, options) !== undefined;
}
