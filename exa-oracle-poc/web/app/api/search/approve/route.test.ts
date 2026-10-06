import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/search/approve/route";
import type { PendingRecord } from "@/types/oracle";

const { appendRecordMock } = vi.hoisted(() => ({ appendRecordMock: vi.fn() }));
vi.mock("@/lib/oracle", () => ({
  appendRecord: appendRecordMock,
  readRecords: vi.fn(),
}));

const { getMock, removeMock } = vi.hoisted(() => ({ getMock: vi.fn(), removeMock: vi.fn() }));
vi.mock("@/lib/pendingStore", () => ({
  get: getMock,
  remove: removeMock,
  stage: vi.fn(),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/search/approve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  appendRecordMock.mockReset();
  getMock.mockReset();
  removeMock.mockReset();
});

describe("POST /api/search/approve", () => {
  it("400s when id is missing", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "missing_id" });
  });

  it("404s when the pending record is unknown or expired", async () => {
    getMock.mockReturnValueOnce(undefined);

    const res = await POST(makeRequest({ id: "missing" }));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "expired_or_not_found" });
    expect(appendRecordMock).not.toHaveBeenCalled();
  });

  it("appends the record, then removes it from the pending store", async () => {
    const pending: PendingRecord = { id: "1", source: "S", fetched_at: "t", datapoint: {}, grounding: [] };
    getMock.mockReturnValueOnce(pending);

    const res = await POST(makeRequest({ id: "1" }));

    expect(res.status).toBe(200);
    const expectedRecord = { source: "S", fetched_at: "t", datapoint: {}, grounding: [] };
    await expect(res.json()).resolves.toEqual({ record: expectedRecord });
    expect(appendRecordMock).toHaveBeenCalledWith(expectedRecord);
    expect(removeMock).toHaveBeenCalledWith("1");
    expect(appendRecordMock.mock.invocationCallOrder[0]).toBeLessThan(removeMock.mock.invocationCallOrder[0]);
  });
});
