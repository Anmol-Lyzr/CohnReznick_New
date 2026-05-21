"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { POC_DOCUMENT_API_ID, POC_DOCUMENT_SLUG } from "@/lib/source-documents";

const SLUG_TO_API: Record<string, string> = {
  [POC_DOCUMENT_SLUG]: POC_DOCUMENT_API_ID,
};

export default function DocumentPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const apiId = SLUG_TO_API[slug];
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiId) {
      setError("Document not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/documents/${apiId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        return res.json();
      })
      .then((data: { title: string; content: string }) => {
        setTitle(data.title);
        setContent(data.content);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [apiId]);

  if (!apiId) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-destructive">Document not found.</p>
        <Link href="/tools/skills/customer-management" className="text-sm text-primary mt-4 inline-block hover:underline">
          Back to Customer Management
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-card/80 backdrop-blur px-4 md:px-8 py-3 flex items-center gap-3">
        <Link
          href="/tools/skills/customer-management"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Customer Management
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <h1 className="text-sm font-bold text-foreground truncate">{title || "Loading…"}</h1>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-4xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Loading document…</span>
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {content !== null && !loading && (
          <article className="glass-card rounded-xl p-6 md:p-8 prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/85 prose-li:text-foreground/85 prose-strong:text-foreground prose-table:text-sm [&_table]:border-collapse [&_th]:border [&_th]:border-border/50 [&_td]:border [&_td]:border-border/40">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        )}
      </main>
    </div>
  );
}
