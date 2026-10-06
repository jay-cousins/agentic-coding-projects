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

  pendingStore.remove(id);
  return new Response(null, { status: 204 });
}
