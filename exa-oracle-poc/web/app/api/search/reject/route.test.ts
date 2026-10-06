import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/search/reject/route";

const { removeMock } = vi.hoisted(() => ({ removeMock: vi.fn() }));
vi.mock("@/lib/pendingStore", () => ({
  remove: removeMock,
  get: vi.fn(),
  stage: vi.fn(),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/search/reject", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  removeMock.mockReset();
});

describe("POST /api/search/reject", () => {
  it("400s when id is missing", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "missing_id" });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("204s and removes the id, even if it was never staged or already expired", async () => {
    const res = await POST(makeRequest({ id: "unknown" }));

    expect(res.status).toBe(204);
    expect(removeMock).toHaveBeenCalledWith("unknown");
  });
});
