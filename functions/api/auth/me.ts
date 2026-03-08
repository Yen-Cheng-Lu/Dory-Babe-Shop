/**
 * 取得當前登入會員（含 isAdmin）
 * 路徑: /api/auth/me
 */

import { getMemberAndAdminStatus } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_LINE_USER_IDS?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json({ error: "D1 未綁定" }, { status: 503 });
  }
  const auth = context.request.headers.get("Authorization");
  const result = await getMemberAndAdminStatus(
    context.env.DB,
    auth,
    context.env.ADMIN_LINE_USER_IDS
  );
  if (!result) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberRow = await context.env.DB.prepare(
    "SELECT id, lineUserId, displayName, pictureUrl, createdAt FROM members WHERE id = ?"
  )
    .bind(result.member.id)
    .first<{ id: number; lineUserId: string; displayName: string | null; pictureUrl: string | null; createdAt: string }>();
  if (!memberRow) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(
    { ...memberRow, isAdmin: result.isAdmin },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
};
