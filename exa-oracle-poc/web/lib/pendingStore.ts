import type { PendingRecord } from "@/types/oracle";
import { PENDING_TTL_MS } from "@/lib/pendingTtl";

interface StoredEntry {
  record: PendingRecord;
  stagedAt: number;
}

declare global {
  var __oraclePendingStore: Map<string, StoredEntry> | undefined;
}

// globalThis-guarded singleton so `next dev`'s module reloads don't reset the map.
//
// This only lives in one Node process's memory. That's fine for a single `next
// dev`/`next start` instance, but it does NOT survive a process restart and is
// NOT shared across instances — it will silently drop pending results (client
// gets "expired_or_not_found") if this app is ever run with multiple instances
// or on a serverless/edge platform that spins up separate processes per
// request. If that deployment shape is needed, replace this Map with a shared
// store (Redis, a database table, etc.) keyed by id with the same TTL-eviction
// semantics.
const store = globalThis.__oraclePendingStore ?? new Map<string, StoredEntry>();
globalThis.__oraclePendingStore = store;

function evictExpired(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [id, entry] of store) {
    if (entry.stagedAt < cutoff) {
      store.delete(id);
    }
  }
}

export function stage(record: PendingRecord): void {
  evictExpired();
  store.set(record.id, { record, stagedAt: Date.now() });
}

export function get(id: string): PendingRecord | undefined {
  evictExpired();
  return store.get(id)?.record;
}

export function remove(id: string): void {
  store.delete(id);
}
