"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const generationStatuses = [
  "Generating documentation...",
  "Structuring your clinical note...",
  "Reviewing clinical details...",
  "Preparing your documentation...",
];

export function GenerationIndicator({ className }: { className?: string }) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % generationStatuses.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div aria-live="polite" className={cn("inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)] shadow-sm", className)} role="status">
      <span>{generationStatuses[statusIndex]}</span>
      <span aria-hidden="true" className="inline-flex gap-1">
        {[0, 1, 2].map((dot) => <span className="size-1.5 animate-pulse rounded-full bg-[var(--primary)]" key={dot} style={{ animationDelay: `${dot * 120}ms` }} />)}
      </span>
    </div>
  );
}
