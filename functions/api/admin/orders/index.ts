/**
 * 後台訂單清單 API
 * 路徑: /api/admin/orders
 */

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const { results } = await context.env.DB.prepare(
    "SELECT o.*, m.displayName as memberName FROM orders o LEFT JOIN members m ON o.memberId = m.id ORDER BY o.createdAt DESC"
  ).all();
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
