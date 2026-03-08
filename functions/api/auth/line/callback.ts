/**
 * Line 登入 callback - 交換 code 取得 token，建立/更新會員，導回前端
 * 路徑: /api/auth/line/callback
 */

interface Env {
  DB: D1Database;
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const clientId = context.env.LINE_CHANNEL_ID;
  const clientSecret = context.env.LINE_CHANNEL_SECRET;
  const baseUrl = url.origin;
  const redirectUri = `${baseUrl}/api/auth/line/callback`;
  const frontendUrl = baseUrl;

  if (!code || !clientId || !clientSecret) {
    return Response.redirect(`${frontendUrl}/?login=error`, 302);
  }
  try {
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return Response.redirect(`${frontendUrl}/?login=error`, 302);
    }
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as { userId?: string; displayName?: string; pictureUrl?: string };
    const lineUserId = profile.userId;
    const displayName = profile.displayName || null;
    const pictureUrl = profile.pictureUrl || null;

    if (!lineUserId) return Response.redirect(`${frontendUrl}/?login=error`, 302);

    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const existing = await context.env.DB.prepare("SELECT id FROM members WHERE lineUserId = ?")
      .bind(lineUserId)
      .first<{ id: number }>();

    if (existing) {
      await context.env.DB.prepare(
        "UPDATE members SET displayName = ?, pictureUrl = ?, sessionToken = ?, sessionExpiresAt = ?, updatedAt = datetime('now') WHERE id = ?"
      )
        .bind(displayName, pictureUrl, sessionToken, expiresAt, existing.id)
        .run();
    } else {
      await context.env.DB.prepare(
        "INSERT INTO members (lineUserId, displayName, pictureUrl, sessionToken, sessionExpiresAt) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(lineUserId, displayName, pictureUrl, sessionToken, expiresAt)
        .run();
    }
    return Response.redirect(`${frontendUrl}/?login=success&token=${sessionToken}`, 302);
  } catch (err) {
    console.error("Line callback error:", err);
    return Response.redirect(`${frontendUrl}/?login=error`, 302);
  }
};
