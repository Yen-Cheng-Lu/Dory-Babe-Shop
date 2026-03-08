/**
 * 購物車 API - GET、POST
 * 路徑: /api/cart
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
    "SELECT c.*, p.name, p.price, p.imageUrl, p.galleryImages FROM cart_items c JOIN products p ON c.productId = p.id WHERE c.memberId = ?"
  )
    .bind(memberId)
    .all();
  const items = (results || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    memberId: r.memberId,
    productId: r.productId,
    quantity: r.quantity,
    createdAt: r.createdAt,
    product: {
      id: r.productId,
      name: r.name,
      price: r.price,
      imageUrl: r.imageUrl,
      galleryImages: typeof r.galleryImages === "string" ? JSON.parse(r.galleryImages || "[]") : r.galleryImages,
    },
  }));
  return Response.json({ items }, { headers: { "Access-Control-Allow-Origin": "*" } });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const memberId = await getMemberId(context.env.DB, context.request.headers.get("Authorization"));
  if (!memberId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await context.request.json()) as { productId?: number; quantity?: number };
  const productId = body.productId;
  if (!productId) return Response.json({ error: "productId required" }, { status: 400 });
  const qty = Math.max(1, Math.min(999, Number(body.quantity) || 1));
  await context.env.DB.prepare(
    "INSERT INTO cart_items (memberId, productId, quantity) VALUES (?, ?, ?) ON CONFLICT(memberId, productId) DO UPDATE SET quantity = quantity + excluded.quantity"
  )
    .bind(memberId, productId, qty)
    .run();
  const row = await context.env.DB.prepare(
    "SELECT c.*, p.name, p.price, p.imageUrl FROM cart_items c JOIN products p ON c.productId = p.id WHERE c.memberId = ? AND c.productId = ?"
  )
    .bind(memberId, productId)
    .first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Failed to fetch cart item" }, { status: 500 });
  return Response.json(
    {
      id: row.id,
      memberId: row.memberId,
      productId: row.productId,
      quantity: row.quantity,
      createdAt: row.createdAt,
      product: { id: row.productId, name: row.name, price: row.price, imageUrl: row.imageUrl },
    },
    { status: 201, headers: { "Access-Control-Allow-Origin": "*" } }
  );
};
