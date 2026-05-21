"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function StoredDocumentResolveInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = searchParams.get("client") ?? "";
  const name = searchParams.get("name") ?? "";

  useEffect(() => {
    if (!client || !name) {
      router.replace("/tools/skills/customer-management");
      return;
    }
    fetch(
      `/api/store/documents/resolve?client=${encodeURIComponent(client)}&name=${encodeURIComponent(name)}`
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Not found"))))
      .then((data: { id: string }) => {
        router.replace(`/documents/stored/${data.id}`);
      })
      .catch(() => {
        router.replace("/tools/skills/customer-management");
      });
  }, [client, name, router]);

  return (
    <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span className="text-sm">Opening document…</span>
    </div>
  );
}

/** Resolves client+filename to a stored document id and redirects. */
export default function StoredDocumentResolvePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Loading…</span>
        </div>
      }
    >
      <StoredDocumentResolveInner />
    </Suspense>
  );
}
