/**
 * 單一訂單 API - GET
 * 路徑: /api/orders/:id
 */

interface Env {
  DB: D1Database;
}

async function getMemberId(db: D1Database, auth: string | null): Promise<number | null> {
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const t = auth.slice(7);
  const row = await db.prepare(
    "SELECT id FROM members WHERE sessionToken = ? AND (sessionExpiresAt IS NULL OR sessionExpiresAt > datetime('now'))"
  )
    .bind(t)
    .first<{ id: number }>();
  return row?.id ?? null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const memberId = await getMemberId(context.env.DB, context.request.headers.get("Authorization"));
  if (!memberId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid order ID" }, { status: 400 });
  const order = await context.env.DB.prepare("SELECT * FROM orders WHERE id = ? AND memberId = ?")
    .bind(id, memberId)
    .first<Record<string, unknown>>();
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const { results: items } = await context.env.DB.prepare("SELECT * FROM order_items WHERE orderId = ?")
    .bind(id)
    .all();
  return Response.json({ ...order, items: items || [] }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
