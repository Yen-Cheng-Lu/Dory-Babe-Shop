/**
 * LINE 登入設定狀態
 * 路徑: /api/auth/line/status
 */

interface Env {
  LINE_CHANNEL_ID?: string;
  LINE_CHANNEL_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const configured = !!(
    context.env.LINE_CHANNEL_ID &&
    context.env.LINE_CHANNEL_SECRET
  );
  return Response.json({ configured }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
