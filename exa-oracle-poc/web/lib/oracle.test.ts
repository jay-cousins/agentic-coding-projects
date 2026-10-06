import { promises as fs } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendRecord, readRecords } from "@/lib/oracle";
import type { OracleRecord } from "@/types/oracle";

vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(),
    appendFile: vi.fn(),
  },
}));

const readFileMock = vi.mocked(fs.readFile);
const appendFileMock = vi.mocked(fs.appendFile);

beforeEach(() => {
  readFileMock.mockReset();
  appendFileMock.mockReset();
});

describe("readRecords", () => {
  it("returns [] when the file doesn't exist yet", async () => {
    const enoent = Object.assign(new Error("no such file"), { code: "ENOENT" });
    readFileMock.mockRejectedValueOnce(enoent);

    await expect(readRecords()).resolves.toEqual([]);
  });

  it("rethrows non-ENOENT filesystem errors", async () => {
    readFileMock.mockRejectedValueOnce(new Error("permission denied"));

    await expect(readRecords()).rejects.toThrow("permission denied");
  });

  it("skips malformed lines and returns the rest newest-first", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const recordA: OracleRecord = { source: "A", fetched_at: "t1", datapoint: {}, grounding: [] };
    const recordB: OracleRecord = { source: "B", fetched_at: "t2", datapoint: {}, grounding: [] };
    const raw = [JSON.stringify(recordA), "not json", JSON.stringify(recordB), ""].join("\n");
    readFileMock.mockResolvedValueOnce(raw);

    const records = await readRecords();

    expect(records).toEqual([recordB, recordA]);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });
});

describe("appendRecord", () => {
  it("appends one JSON line", async () => {
    appendFileMock.mockResolvedValueOnce(undefined);
    const record: OracleRecord = { source: "A", fetched_at: "t1", datapoint: { winner: "X" }, grounding: [] };

    await appendRecord(record);

    expect(appendFileMock).toHaveBeenCalledWith(expect.any(String), JSON.stringify(record) + "\n");
  });
});
