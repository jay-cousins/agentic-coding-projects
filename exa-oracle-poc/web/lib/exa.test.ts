import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCopernicusBulletin, fetchUsOpenResult } from "@/lib/exa";

const { searchMock } = vi.hoisted(() => ({ searchMock: vi.fn() }));

vi.mock("exa-js", () => ({
  default: class {
    search = searchMock;
  },
}));

const originalApiKey = process.env.EXA_API_KEY;

beforeEach(() => {
  process.env.EXA_API_KEY = "test-key";
  searchMock.mockReset();
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.EXA_API_KEY;
  else process.env.EXA_API_KEY = originalApiKey;
});

describe("fetchUsOpenResult / fetchCopernicusBulletin", () => {
  it("coerces every content field to a string", async () => {
    searchMock.mockResolvedValueOnce({
      output: {
        content: { winner: "Alice", score: 42, meta: { x: 1 }, note: null, flag: true },
        grounding: [{ field: "winner", citations: [], confidence: "high" }],
      },
    });

    const result = await fetchUsOpenResult();

    expect(result.datapoint).toEqual({
      winner: "Alice",
      score: "42",
      meta: JSON.stringify({ x: 1 }),
      note: "",
      flag: "true",
    });
    expect(result.grounding).toEqual([{ field: "winner", citations: [], confidence: "high" }]);
  });

  it("throws when output.content is not an object", async () => {
    searchMock.mockResolvedValueOnce({ output: { content: "plain string", grounding: [] } });

    await expect(fetchUsOpenResult()).rejects.toThrow(/structured output/);
  });

  it("throws when output.content is missing", async () => {
    searchMock.mockResolvedValueOnce({ output: { grounding: [] } });

    await expect(fetchUsOpenResult()).rejects.toThrow(/structured output/);
  });

  it("throws when the response has no synthesized output at all", async () => {
    searchMock.mockResolvedValueOnce({ output: null });

    await expect(fetchCopernicusBulletin()).rejects.toThrow(/synthesized output/);
  });

  it("defaults grounding to [] when Exa omits it", async () => {
    searchMock.mockResolvedValueOnce({ output: { content: { headline: "H" } } });

    const result = await fetchCopernicusBulletin();

    expect(result.grounding).toEqual([]);
  });

  it("throws before calling search when EXA_API_KEY is unset", async () => {
    delete process.env.EXA_API_KEY;

    await expect(fetchUsOpenResult()).rejects.toThrow(/EXA_API_KEY/);
    expect(searchMock).not.toHaveBeenCalled();
  });
});
