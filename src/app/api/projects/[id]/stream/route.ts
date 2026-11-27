import { randomUUID } from "node:crypto";
import { workspaceAccess } from "@/lib/collab";
import { hub, type LiveEvent } from "@/lib/realtime";
import { getUserOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** Server-Sent Events: one open connection per viewer. Only the two people on the project can connect. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getUserOrNull();
  if (!user) return new Response("Please sign in again.", { status: 401 });
  if (!(await workspaceAccess(user, id))) return new Response("Not found", { status: 404 });

  const enc = new TextEncoder();
  const connId = randomUUID(); // one per open connection, so presence survives other tabs and other servers
  let cleanup = () => {};
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: LiveEvent) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} };
      const off = await hub.subscribe(id, send);
      await hub.join(id, user.id, connId);
      send({ type: "presence", online: await hub.online(id) });
      // Keep the connection open through proxies, and keep our presence entry fresh.
      const beat = setInterval(() => {
        try { controller.enqueue(enc.encode(": keep-alive\n\n")); } catch {}
        hub.beat(id, user.id, connId).catch(() => {});
      }, 20_000);
      let closed = false;
      cleanup = () => { if (closed) return; closed = true; clearInterval(beat); off(); hub.leave(id, user.id, connId).catch(() => {}); try { controller.close(); } catch {} };
      if (req.signal.aborted) cleanup(); else req.signal.addEventListener("abort", cleanup);
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
