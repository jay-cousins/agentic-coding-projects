import { promises as fs } from "node:fs";
import path from "node:path";
import type { OracleRecord } from "@/types/oracle";

// EXA/web -> EXA/oracle_output.jsonl, overridable if the app's location ever changes.
const ORACLE_PATH =
  process.env.ORACLE_JSONL_PATH ??
  path.resolve(process.cwd(), "..", "oracle_output.jsonl");

export async function readRecords(): Promise<OracleRecord[]> {
  let raw: string;
  try {
    raw = await fs.readFile(/* turbopackIgnore: true */ ORACLE_PATH, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const records: OracleRecord[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as OracleRecord);
    } catch {
      console.warn("Skipping malformed line in oracle_output.jsonl");
    }
  }
  // Newest first for the browse view.
  return records.reverse();
}

export async function appendRecord(record: OracleRecord): Promise<void> {
  await fs.appendFile(/* turbopackIgnore: true */ ORACLE_PATH, JSON.stringify(record) + "\n");
}
