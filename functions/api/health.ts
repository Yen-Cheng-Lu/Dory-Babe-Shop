/**
 * 健康檢查 API - 診斷 D1 綁定狀態
 * 路徑: /api/health
 */

interface Env {
  DB?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const checks: Record<string, string> = {};

  try {
    if (!context.env.DB) {
      checks.db = "未綁定 - 請至 Cloudflare Dashboard > Settings > Functions > Bindings 新增 D1 綁定，變數名稱必須為 DB";
      return Response.json(
        { ok: false, checks, message: "D1 資料庫未綁定" },
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    await context.env.DB.prepare("SELECT 1").first();
    checks.db = "已連線";
  } catch (err) {
    checks.db = `錯誤: ${err instanceof Error ? err.message : String(err)}`;
    return Response.json(
      { ok: false, checks, message: "D1 連線失敗" },
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  return Response.json(
    { ok: true, checks },
    { headers: { "Content-Type": "application/json" } }
  );
};
