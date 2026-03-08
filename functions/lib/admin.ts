/**
 * 後台權限檢查共用模組
 * 管理員資格：資料庫 isAdmin=1 或 ADMIN_LINE_USER_IDS 環境變數
 */

export interface AdminEnv {
  DB: D1Database;
  ADMIN_LINE_USER_IDS?: string;
}

async function getMemberFromToken(
  db: D1Database,
  auth: string | null
): Promise<{ id: number; lineUserId: string; isAdmin?: number } | null> {
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const t = auth.slice(7);
  const row = await db
    .prepare(
      "SELECT id, lineUserId, COALESCE(isAdmin, 0) as isAdmin FROM members WHERE sessionToken = ? AND (sessionExpiresAt IS NULL OR sessionExpiresAt > datetime('now'))"
    )
    .bind(t)
    .first<{ id: number; lineUserId: string; isAdmin: number }>();
  return row;
}

function isAdminFromEnv(lineUserId: string, adminList: string | undefined): boolean {
  if (!adminList || !adminList.trim()) return false;
  const ids = adminList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(lineUserId);
}

export type RequireAdminResult =
  | { ok: true; memberId: number }
  | { ok: false; response: Response };

export async function requireAdmin(context: {
  env: AdminEnv;
  request: Request;
}): Promise<RequireAdminResult> {
  if (!context.env.DB) {
    return {
      ok: false,
      response: Response.json({ error: "D1 未綁定" }, { status: 503, headers: { "Access-Control-Allow-Origin": "*" } }),
    };
  }
  const auth = context.request.headers.get("Authorization");
  const member = await getMemberFromToken(context.env.DB, auth);
  if (!member) {
    return {
      ok: false,
      response: Response.json({ error: "請先登入" }, { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }),
    };
  }
  const isAdmin = member.isAdmin === 1 || isAdminFromEnv(member.lineUserId, context.env.ADMIN_LINE_USER_IDS);
  if (!isAdmin) {
    return {
      ok: false,
      response: Response.json(
        { error: "需要管理員權限才能存取" },
        { status: 403, headers: { "Access-Control-Allow-Origin": "*" } }
      ),
    };
  }
  return { ok: true, memberId: member.id };
}

export async function getMemberAndAdminStatus(
  db: D1Database,
  auth: string | null,
  adminList: string | undefined
): Promise<{ member: { id: number; lineUserId: string }; isAdmin: boolean } | null> {
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const t = auth.slice(7);
  const row = await db
    .prepare(
      "SELECT id, lineUserId, COALESCE(isAdmin, 0) as isAdmin FROM members WHERE sessionToken = ? AND (sessionExpiresAt IS NULL OR sessionExpiresAt > datetime('now'))"
    )
    .bind(t)
    .first<{ id: number; lineUserId: string; isAdmin: number }>();
  if (!row) return null;
  const isAdmin = row.isAdmin === 1 || isAdminFromEnv(row.lineUserId, adminList);
  return { member: { id: row.id, lineUserId: row.lineUserId }, isAdmin };
}
