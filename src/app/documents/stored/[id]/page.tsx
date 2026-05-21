"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";

export default function StoredDocumentPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<"text" | "binary">("text");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("Missing document id");
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/store/documents/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        return res.json();
      })
      .then(
        (data: {
          filename: string;
          content?: string;
          preview: string;
          message?: string;
          downloadUrl?: string;
        }) => {
          setTitle(data.filename);
          setPreview(data.preview === "binary" ? "binary" : "text");
          setContent(data.content ?? data.message ?? null);
          setDownloadUrl(data.downloadUrl ?? `/api/store/documents/${id}?download=1`);
          setLoading(false);
        }
      )
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

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
        {downloadUrl && (
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        )}
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
        {content !== null && !loading && preview === "text" && (
          <article className="glass-card rounded-xl p-6 md:p-8 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        )}
        {content !== null && !loading && preview === "binary" && (
          <div className="glass-card rounded-xl p-6 text-sm text-muted-foreground">{content}</div>
        )}
      </main>
    </div>
  );
}
