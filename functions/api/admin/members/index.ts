/**
 * 後台會員清單 API
 * 路徑: /api/admin/members
 */

import { requireAdmin, type AdminEnv } from "../../../lib/admin";

export const onRequestGet: PagesFunction<AdminEnv> = async (context) => {
  const authResult = await requireAdmin(context);
  if (!authResult.ok) return authResult.response;
  if (!context.env.DB) return Response.json({ error: "D1 未綁定" }, { status: 503 });
  const { results } = await context.env.DB.prepare(
    "SELECT id, lineUserId, displayName, pictureUrl, createdAt, lastLoginAt FROM members ORDER BY COALESCE(lastLoginAt, createdAt) DESC"
  ).all();
  return Response.json({ members: results || [] }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
