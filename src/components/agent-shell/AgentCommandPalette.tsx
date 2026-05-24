"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useAgentShell } from "@/context/AgentShellProvider";
import { useRouter } from "next/navigation";

export function AgentCommandPalette() {
  const { commandOpen, setCommandOpen, commandItems, handleCta } = useAgentShell();
  const [q, setQ] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return commandItems;
    return commandItems.filter((i) => i.label.toLowerCase().includes(term));
  }, [q, commandItems]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [filtered]);

  if (!commandOpen) return null;

  const run = (item: (typeof commandItems)[0]) => {
    setCommandOpen(false);
    setQ("");
    if (item.href) {
      router.push(item.href);
      return;
    }
    if (item.action === "inbox") {
      handleCta({ id: "cmd", type: "review", label: item.label, action: "inbox" });
      return;
    }
    if (item.action === "chat") {
      handleCta({ id: "cmd", type: "delegate", label: item.label, action: "chat" });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" onClick={() => setCommandOpen(false)} />
      <div className="fixed left-1/2 top-[15%] z-[71] w-full max-w-lg -translate-x-1/2 rounded-xl border border-border/60 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search skills, engagements, actions…"
            className="flex-1 text-sm bg-transparent outline-none"
          />
          <kbd className="text-[10px] text-muted-foreground hidden sm:inline">⌘K</kbd>
          <button type="button" onClick={() => setCommandOpen(false)} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-2">
          {[...grouped.entries()].map(([group, items]) => (
            <div key={group} className="mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 py-1">
                {group}
              </p>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => run(item)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No matches</p>
          )}
        </div>
      </div>
    </>
  );
}
