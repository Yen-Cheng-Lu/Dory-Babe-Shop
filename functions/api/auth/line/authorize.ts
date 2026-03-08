/**
 * Line 登入 - 取得授權 URL
 * 路徑: /api/auth/line/authorize
 */

interface Env {
  DB?: D1Database;
  LINE_CHANNEL_ID?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = context.env.LINE_CHANNEL_ID;
  const url = new URL(context.request.url);
  const baseUrl = url.origin;
  const redirectUri = `${baseUrl}/api/auth/line/callback`;
  if (!clientId) {
    return Response.json({ url: "" }, { headers: { "Access-Control-Allow-Origin": "*" } });
  }
  const state = crypto.randomUUID().replace(/-/g, "");
  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`;
  return Response.json({ url: authUrl }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
