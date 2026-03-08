/**
 * 後台會員清單 API
 * 路徑: /api/admin/members
 */

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const { results } = await context.env.DB.prepare(
    "SELECT id, lineUserId, displayName, pictureUrl, createdAt FROM members ORDER BY createdAt DESC"
  ).all();
  return Response.json({ members: results || [] }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
