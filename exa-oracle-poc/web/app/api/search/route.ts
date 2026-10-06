import { randomUUID } from "node:crypto";
import { fetchCopernicusBulletin, fetchUsOpenResult } from "@/lib/exa";
import * as pendingStore from "@/lib/pendingStore";
import { SOURCE_LABELS, type SourceKey } from "@/types/oracle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCHERS: Record<SourceKey, () => ReturnType<typeof fetchUsOpenResult>> = {
  us_open: fetchUsOpenResult,
  copernicus: fetchCopernicusBulletin,
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const source = (body as { source?: string })?.source;
  if (source !== "us_open" && source !== "copernicus") {
    return Response.json({ error: "invalid_source" }, { status: 400 });
  }

  try {
    const { datapoint, grounding } = await FETCHERS[source]();
    const record = {
      id: randomUUID(),
      source: SOURCE_LABELS[source],
      fetched_at: new Date().toISOString(),
      datapoint,
      grounding,
    };
    pendingStore.stage(record);
    return Response.json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
