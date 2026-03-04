/**
 * 商品排序 API - PUT
 * 路徑: /api/products/reorder
 */

interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json(
      { error: "D1 未綁定", message: "請至 Cloudflare Dashboard 新增 D1 綁定，變數名稱必須為 DB" },
      { status: 503 }
    );
  }
  try {
    const body = await context.request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return Response.json(
        { error: "updates must be an array" },
        { status: 400 }
      );
    }

    const stmt = context.env.DB.prepare("UPDATE products SET orderIndex = ? WHERE id = ?");

    await context.env.DB.batch(
      updates.map((u: { id: number; orderIndex: number }) =>
        stmt.bind(u.orderIndex, u.id)
      )
    );

    return Response.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error reordering products:", err);
    return Response.json(
      { error: "Failed to reorder products" },
      { status: 500 }
    );
  }
};
