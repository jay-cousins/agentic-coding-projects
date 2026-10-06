import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/search/route";
import { SOURCE_LABELS } from "@/types/oracle";

const { fetchUsOpenResultMock, fetchCopernicusBulletinMock } = vi.hoisted(() => ({
  fetchUsOpenResultMock: vi.fn(),
  fetchCopernicusBulletinMock: vi.fn(),
}));
vi.mock("@/lib/exa", () => ({
  fetchUsOpenResult: fetchUsOpenResultMock,
  fetchCopernicusBulletin: fetchCopernicusBulletinMock,
}));

const { stageMock } = vi.hoisted(() => ({ stageMock: vi.fn() }));
vi.mock("@/lib/pendingStore", () => ({
  stage: stageMock,
  get: vi.fn(),
  remove: vi.fn(),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/search", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  fetchUsOpenResultMock.mockReset();
  fetchCopernicusBulletinMock.mockReset();
  stageMock.mockReset();
});

describe("POST /api/search", () => {
  it("400s on an invalid JSON body", async () => {
    const res = await POST(makeRequest("not-json"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid_json" });
  });

  it("400s on an unrecognized source", async () => {
    const res = await POST(makeRequest({ source: "bogus" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid_source" });
  });

  it("fetches via the matching source, stages the result, and returns it", async () => {
    fetchUsOpenResultMock.mockResolvedValueOnce({ datapoint: { winner: "A" }, grounding: [] });

    const res = await POST(makeRequest({ source: "us_open" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.record).toMatchObject({ source: SOURCE_LABELS.us_open, datapoint: { winner: "A" }, grounding: [] });
    expect(typeof body.record.id).toBe("string");
    expect(typeof body.record.fetched_at).toBe("string");
    expect(stageMock).toHaveBeenCalledWith(body.record);
    expect(fetchCopernicusBulletinMock).not.toHaveBeenCalled();
  });

  it("502s with the error message when the fetcher rejects", async () => {
    fetchUsOpenResultMock.mockRejectedValueOnce(new Error("boom"));

    const res = await POST(makeRequest({ source: "us_open" }));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: "boom" });
    expect(stageMock).not.toHaveBeenCalled();
  });
});
