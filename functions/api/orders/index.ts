/**
 * 訂單 API - GET、POST
 * 路徑: /api/orders
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
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM orders WHERE memberId = ? ORDER BY createdAt DESC"
  )
    .bind(memberId)
    .all();
  const orders = await Promise.all(
    (results || []).map(async (o: Record<string, unknown>) => {
      const { results: items } = await context.env.DB!.prepare("SELECT * FROM order_items WHERE orderId = ?")
        .bind(o.id)
        .all();
      return { ...o, items: items || [] };
    })
  );
  return Response.json({ orders }, { headers: { "Access-Control-Allow-Origin": "*" } });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const memberId = await getMemberId(context.env.DB, context.request.headers.get("Authorization"));
  if (!memberId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await context.request.json()) as { note?: string; recipientName?: string; pickupStore?: string; phone?: string };
  const note = body.note || null;
  const recipientName = (body.recipientName || "").trim();
  const pickupStore = (body.pickupStore || "").trim();
  const phone = (body.phone || "").trim();
  if (!recipientName || !pickupStore || !phone) {
    return Response.json(
      { error: "請填寫收件人姓名、賣貨便取貨門市及手機號碼" },
      { status: 400 }
    );
  }
  const cartRows = await context.env.DB.prepare(
    "SELECT c.*, p.name, p.price, p.maxPrice, p.imageUrl FROM cart_items c JOIN products p ON c.productId = p.id WHERE c.memberId = ?"
  )
    .bind(memberId)
    .all();
  const items = cartRows.results || [];
  if (items.length === 0) return Response.json({ error: "Cart is empty" }, { status: 400 });
  const orderResult = await context.env.DB.prepare(
    "INSERT INTO orders (memberId, note, recipientName, pickupStore, phone) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(memberId, note, recipientName, pickupStore, phone)
    .run();
  const orderId = orderResult.meta.last_row_id;
  const insertStmt = context.env.DB.prepare(
    "INSERT INTO order_items (orderId, productId, productName, productPrice, productMaxPrice, quantity, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const row of items as Record<string, unknown>[]) {
    await insertStmt
      .bind(orderId, row.productId, row.name, row.price, row.maxPrice ?? null, row.quantity, row.imageUrl)
      .run();
  }
  await context.env.DB.prepare("DELETE FROM cart_items WHERE memberId = ?").bind(memberId).run();
  const order = await context.env.DB.prepare("SELECT * FROM orders WHERE id = ?")
    .bind(orderId)
    .first<Record<string, unknown>>();
  const { results: orderItems } = await context.env.DB.prepare("SELECT * FROM order_items WHERE orderId = ?")
    .bind(orderId)
    .all();
  return Response.json(
    { ...order, items: orderItems || [] },
    { status: 201, headers: { "Access-Control-Allow-Origin": "*" } }
  );
};
