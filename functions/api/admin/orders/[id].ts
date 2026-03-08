/**
 * 後台訂單狀態更新 API
 * 路徑: /api/admin/orders/:id
 */

interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid order ID" }, { status: 400 });
  const body = (await context.request.json()) as { paymentStatus?: string; shippingStatus?: string };
  const updates: string[] = [];
  const values: unknown[] = [];
  if (body.paymentStatus === "paid" || body.paymentStatus === "unpaid") {
    updates.push("paymentStatus = ?");
    values.push(body.paymentStatus);
  }
  if (body.shippingStatus === "shipped" || body.shippingStatus === "unshipped") {
    updates.push("shippingStatus = ?");
    values.push(body.shippingStatus);
  }
  if (updates.length === 0) return Response.json({ error: "No valid updates" }, { status: 400 });
  updates.push("updatedAt = datetime('now')");
  values.push(id);
  const result = await context.env.DB.prepare(
    `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...values).run();
  if (result.meta.changes === 0) return Response.json({ error: "Order not found" }, { status: 404 });
  const order = await context.env.DB.prepare("SELECT * FROM orders WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  const { results: items } = await context.env.DB.prepare("SELECT * FROM order_items WHERE orderId = ?")
    .bind(id)
    .all();
  return Response.json({ ...order, items: items || [] }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
