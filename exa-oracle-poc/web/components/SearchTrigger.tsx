"use client";

import { useState } from "react";
import { postJson } from "@/lib/apiClient";
import type { PendingRecord, SourceKey } from "@/types/oracle";

const BUTTONS: { source: SourceKey; label: string }[] = [
  { source: "us_open", label: "Fetch US Open Result" },
  { source: "copernicus", label: "Fetch Copernicus Bulletin" },
];

export function SearchTrigger({ onStaged }: { onStaged: (record: PendingRecord) => void }) {
  const [loading, setLoading] = useState<SourceKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function trigger(source: SourceKey) {
    setLoading(source);
    setError(null);
    try {
      const { record } = await postJson<{ record: PendingRecord }>(
        "/api/search",
        { source },
        { fallbackMessage: "Search failed." }
      );
      onStaged(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mb-8 flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {BUTTONS.map(({ source, label }) => (
          <button
            key={source}
            type="button"
            onClick={() => trigger(source)}
            disabled={loading !== null}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:border-primary disabled:opacity-60"
          >
            {loading === source ? "Searching…" : label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-confidence-low-fg">{error}</p> : null}
    </div>
  );
}
