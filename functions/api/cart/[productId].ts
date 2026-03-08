/**
 * 購物車項目 API - PUT、DELETE
 * 路徑: /api/cart/:productId
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

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const memberId = await getMemberId(context.env.DB, context.request.headers.get("Authorization"));
  if (!memberId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const productId = Number(context.params.productId);
  if (isNaN(productId)) return Response.json({ error: "Invalid productId" }, { status: 400 });
  const body = (await context.request.json()) as { quantity?: number };
  const qty = Math.max(1, Math.min(999, Number(body.quantity) || 1));
  const result = await context.env.DB.prepare(
    "UPDATE cart_items SET quantity = ? WHERE memberId = ? AND productId = ?"
  )
    .bind(qty, memberId, productId)
    .run();
  if (result.meta.changes === 0) return Response.json({ error: "Cart item not found" }, { status: 404 });
  return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const memberId = await getMemberId(context.env.DB, context.request.headers.get("Authorization"));
  if (!memberId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const productId = Number(context.params.productId);
  if (isNaN(productId)) return Response.json({ error: "Invalid productId" }, { status: 400 });
  await context.env.DB.prepare("DELETE FROM cart_items WHERE memberId = ? AND productId = ?")
    .bind(memberId, productId)
    .run();
  return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
