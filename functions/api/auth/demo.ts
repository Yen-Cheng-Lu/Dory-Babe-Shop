/**
 * 試用登入（開發用）
 * 路徑: /api/auth/demo
 */

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json({ error: "D1 未綁定" }, { status: 503 });
  }
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const existing = await context.env.DB.prepare("SELECT * FROM members WHERE lineUserId = ?")
    .bind("demo-user")
    .first<{ id: number; lineUserId: string; displayName: string | null; pictureUrl: string | null; createdAt: string }>();
  if (existing) {
    await context.env.DB.prepare(
      "UPDATE members SET sessionToken = ?, sessionExpiresAt = ?, lastLoginAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?"
    )
      .bind(sessionToken, expiresAt, existing.id)
      .run();
    return Response.json(
      {
        member: {
          id: existing.id,
          lineUserId: existing.lineUserId,
          displayName: existing.displayName,
          pictureUrl: existing.pictureUrl,
          createdAt: existing.createdAt,
        },
        token: sessionToken,
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
  await context.env.DB.prepare(
    "INSERT INTO members (lineUserId, displayName, pictureUrl, sessionToken, sessionExpiresAt) VALUES (?, ?, ?, ?, ?)"
  )
    .bind("demo-user", "Demo 會員", null, sessionToken, expiresAt)
    .run();
  const result = await context.env.DB.prepare("SELECT id, lineUserId, displayName, pictureUrl, createdAt FROM members WHERE lineUserId = ?")
    .bind("demo-user")
    .first<{ id: number; lineUserId: string; displayName: string | null; pictureUrl: string | null; createdAt: string }>();
  if (!result) return Response.json({ error: "Failed to create member" }, { status: 500 });
  return Response.json(
    { member: result, token: sessionToken },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
};
