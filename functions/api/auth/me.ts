/**
 * 取得當前登入會員
 * 路徑: /api/auth/me
 */

interface Env {
  DB: D1Database;
}

async function getMemberFromToken(db: D1Database, token: string | null): Promise<{ id: number } | null> {
  if (!token || !token.startsWith("Bearer ")) return null;
  const t = token.slice(7);
  const row = await db.prepare(
    "SELECT id FROM members WHERE sessionToken = ? AND (sessionExpiresAt IS NULL OR sessionExpiresAt > datetime('now'))"
  )
    .bind(t)
    .first<{ id: number }>();
  return row ? { id: row.id } : null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json({ error: "D1 未綁定" }, { status: 503 });
  }
  const auth = context.request.headers.get("Authorization");
  const memberData = await getMemberFromToken(context.env.DB, auth);
  if (!memberData) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const member = await context.env.DB.prepare(
    "SELECT id, lineUserId, displayName, pictureUrl, createdAt FROM members WHERE id = ?"
  )
    .bind(memberData.id)
    .first<{ id: number; lineUserId: string; displayName: string | null; pictureUrl: string | null; createdAt: string }>();
  if (!member) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(member, { headers: { "Access-Control-Allow-Origin": "*" } });
};
