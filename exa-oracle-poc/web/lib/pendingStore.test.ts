import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as pendingStore from "@/lib/pendingStore";
import { PENDING_TTL_MS } from "@/lib/pendingTtl";
import type { PendingRecord } from "@/types/oracle";

const record: PendingRecord = { id: "1", source: "S", fetched_at: "t", datapoint: {}, grounding: [] };

beforeEach(() => {
  (globalThis as unknown as { __oraclePendingStore?: Map<string, unknown> }).__oraclePendingStore?.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pendingStore", () => {
  it("round-trips a staged record", () => {
    pendingStore.stage(record);

    expect(pendingStore.get("1")).toEqual(record);
  });

  it("remove is idempotent, including for an id that was never staged", () => {
    expect(() => pendingStore.remove("missing")).not.toThrow();

    pendingStore.stage(record);
    pendingStore.remove("1");

    expect(pendingStore.get("1")).toBeUndefined();
    expect(() => pendingStore.remove("1")).not.toThrow();
  });

  it("evicts an entry once it's older than PENDING_TTL_MS", () => {
    const start = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(start);
    pendingStore.stage(record);
    expect(pendingStore.get("1")).toEqual(record);

    vi.spyOn(Date, "now").mockReturnValue(start + PENDING_TTL_MS + 1);

    expect(pendingStore.get("1")).toBeUndefined();
  });
});
