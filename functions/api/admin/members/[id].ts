/**
 * 後台刪除會員 API
 * 路徑: /api/admin/members/:id
 */

interface Env {
  DB: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid member ID" }, { status: 400 });

  try {
    // 先刪除該會員的購物車項目
    await context.env.DB.prepare("DELETE FROM cart_items WHERE memberId = ?").bind(id).run();
    // 取得該會員的訂單 ID，刪除訂單明細後再刪除訂單
    const { results: orders } = await context.env.DB.prepare("SELECT id FROM orders WHERE memberId = ?")
      .bind(id)
      .all<{ id: number }>();
    for (const o of orders || []) {
      await context.env.DB.prepare("DELETE FROM order_items WHERE orderId = ?").bind(o.id).run();
    }
    await context.env.DB.prepare("DELETE FROM orders WHERE memberId = ?").bind(id).run();
    const result = await context.env.DB.prepare("DELETE FROM members WHERE id = ?").bind(id).run();
    if (result.meta.changes === 0) return Response.json({ error: "Member not found" }, { status: 404 });
    return Response.json({ success: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    console.error("Delete member error:", err);
    return Response.json({ error: "Failed to delete member" }, { status: 500 });
  }
};
