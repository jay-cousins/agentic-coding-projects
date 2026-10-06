import { beforeEach, describe, expect, it, vi } from "vitest";
import { postJson } from "@/lib/apiClient";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("postJson", () => {
  it("resolves the parsed body on an ok response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ record: { id: "1" } }) });

    await expect(postJson("/x", { a: 1 })).resolves.toEqual({ record: { id: "1" } });
  });

  it("resolves undefined on 204 without parsing a body", async () => {
    const jsonSpy = vi.fn();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, json: jsonSpy });

    await expect(postJson("/x", {})).resolves.toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("maps a recognized error code through errorMessages", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: "expired_or_not_found" }) });

    await expect(
      postJson("/x", {}, { errorMessages: { expired_or_not_found: "Expired." }, fallbackMessage: "Failed." })
    ).rejects.toThrow("Expired.");
  });

  it("falls back to the raw error code when it isn't in errorMessages", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "invalid_source" }) });

    await expect(postJson("/x", {}, { fallbackMessage: "Failed." })).rejects.toThrow("invalid_source");
  });

  it("falls back to fallbackMessage when the body has no error code", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    await expect(postJson("/x", {}, { fallbackMessage: "Failed." })).rejects.toThrow("Failed.");
  });

  it("falls back to fallbackMessage when the error body isn't valid JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    });

    await expect(postJson("/x", {}, { fallbackMessage: "Failed." })).rejects.toThrow("Failed.");
  });
});
