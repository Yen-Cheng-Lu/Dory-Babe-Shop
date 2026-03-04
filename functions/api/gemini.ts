/**
 * Gemini API 代理 - 將 API 呼叫移至後端，避免在前端暴露 API Key
 * GEMINI_API_KEY 請在 Cloudflare Dashboard 設定為 Secret
 * 路徑: POST /api/gemini?model=gemini-2.0-flash
 */

interface Env {
  GEMINI_API_KEY: string;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY 未設定，請在 Cloudflare Secrets 中設定" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(context.request.url);
    const model = url.searchParams.get("model") || "gemini-2.0-flash";
    const targetUrl = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

    const body = await context.request.text();
    const headers = new Headers(context.request.headers);
    headers.delete("host");
    headers.set("Content-Type", "application/json");

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: body || undefined,
    });

    const responseText = await response.text();
    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Gemini API proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Gemini API 呼叫失敗", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
};
