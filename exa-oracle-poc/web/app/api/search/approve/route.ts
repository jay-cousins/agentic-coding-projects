import { appendRecord } from "@/lib/oracle";
import * as pendingStore from "@/lib/pendingStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = (body as { id?: string })?.id;
  if (!id) {
    return Response.json({ error: "missing_id" }, { status: 400 });
  }

  const pending = pendingStore.get(id);
  if (!pending) {
    return Response.json({ error: "expired_or_not_found" }, { status: 404 });
  }

  const { source, fetched_at, datapoint, grounding } = pending;
  const record = { source, fetched_at, datapoint, grounding };
  await appendRecord(record);
  pendingStore.remove(id);

  return Response.json({ record });
}
