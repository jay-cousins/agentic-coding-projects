"use client";

import { useState } from "react";
import { OracleDatapoint } from "@/components/OracleDatapoint";
import { postJson } from "@/lib/apiClient";
import type { PendingRecord } from "@/types/oracle";

export function PendingResultCard({
  record,
  onApproved,
  onRejected,
}: {
  record: PendingRecord;
  onApproved: (record: PendingRecord) => void;
  onRejected: (id: string) => void;
}) {
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setPending("approve");
    setError(null);
    try {
      const { record: saved } = await postJson<{ record: PendingRecord }>(
        "/api/search/approve",
        { id: record.id },
        {
          errorMessages: { expired_or_not_found: "This pending result has expired — please search again." },
          fallbackMessage: "Failed to save.",
        }
      );
      onApproved({ ...saved, id: record.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setPending(null);
    }
  }

  async function handleReject() {
    setPending("reject");
    setError(null);
    try {
      await postJson("/api/search/reject", { id: record.id }, { fallbackMessage: "Failed to reject." });
      onRejected(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject.");
      setPending(null);
    }
  }

  return (
    <article className="rounded-lg border-2 border-primary bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-fg">{record.source}</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Pending review
          </span>
        </div>
        <time className="text-xs text-fg-muted" dateTime={record.fetched_at}>
          {new Date(record.fetched_at).toLocaleString()}
        </time>
      </div>

      <OracleDatapoint datapoint={record.datapoint} grounding={record.grounding} />

      {error ? <p className="mt-4 text-sm text-confidence-low-fg">{error}</p> : null}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={pending !== null}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg disabled:opacity-60"
        >
          {pending === "approve" ? "Saving…" : "Approve & Save"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={pending !== null}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg-muted disabled:opacity-60"
        >
          {pending === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </article>
  );
}
