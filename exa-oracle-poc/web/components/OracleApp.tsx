"use client";

import { useEffect, useState } from "react";
import { SearchTrigger } from "@/components/SearchTrigger";
import { PendingResultCard } from "@/components/PendingResultCard";
import { RecordsList } from "@/components/RecordsList";
import { useHasMounted } from "@/hooks/useHasMounted";
import { PENDING_TTL_MS } from "@/lib/pendingTtl";
import type { OracleRecord, PendingRecord } from "@/types/oracle";

const PENDING_STORAGE_KEY = "oracle-pending-results";

// sessionStorage has no TTL of its own, so a pending entry left over from
// before a reload could otherwise outlive the server's pendingStore eviction
// (PENDING_TTL_MS) and render a card that only fails once the user clicks
// Approve. Stamping stagedAt on stage and pruning on read keeps the client
// mirror from showing entries the server has already forgotten.
interface PendingEntry {
  record: PendingRecord;
  stagedAt: number;
}

const EMPTY_PENDING: PendingEntry[] = [];

function isFresh(entry: PendingEntry): boolean {
  return Date.now() - entry.stagedAt < PENDING_TTL_MS;
}

let cachedStoredPending: PendingEntry[] | undefined;

function getStoredPendingSnapshot(): PendingEntry[] {
  if (cachedStoredPending === undefined) {
    try {
      const raw = window.sessionStorage.getItem(PENDING_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as PendingEntry[]) : EMPTY_PENDING;
      cachedStoredPending = parsed.filter(isFresh);
    } catch {
      cachedStoredPending = EMPTY_PENDING;
    }
  }
  return cachedStoredPending;
}

export function OracleApp({ initialRecords }: { initialRecords: OracleRecord[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [pending, setPending] = useState<PendingEntry[]>(EMPTY_PENDING);
  const [adoptedStored, setAdoptedStored] = useState(false);

  const hasMounted = useHasMounted();

  // Once mounted, adopt any pending cards left over from before a reload, once.
  // Approve/Reject still round-trip through the server, which is the source of truth.
  if (hasMounted && !adoptedStored) {
    setAdoptedStored(true);
    const storedPending = getStoredPendingSnapshot();
    if (storedPending.length > 0) {
      setPending(storedPending);
    }
  }

  useEffect(() => {
    if (!hasMounted) return;
    try {
      window.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
    } catch {
      // sessionStorage unavailable (private browsing, etc.) — pending review state
      // just won't survive a reload, which is an acceptable degradation.
    }
  }, [pending, hasMounted]);

  function handleStaged(record: PendingRecord) {
    setPending((prev) => [...prev, { record, stagedAt: Date.now() }]);
  }

  function handleApproved(record: PendingRecord) {
    setPending((prev) => prev.filter((p) => p.record.id !== record.id));
    setRecords((prev) => [record, ...prev]);
  }

  function handleRejected(id: string) {
    setPending((prev) => prev.filter((p) => p.record.id !== id));
  }

  return (
    <>
      <SearchTrigger onStaged={handleStaged} />

      {pending.length > 0 ? (
        <div className="mb-8 flex flex-col gap-4">
          {pending.map(({ record }) => (
            <PendingResultCard
              key={record.id}
              record={record}
              onApproved={handleApproved}
              onRejected={handleRejected}
            />
          ))}
        </div>
      ) : null}

      <RecordsList records={records} />
    </>
  );
}
