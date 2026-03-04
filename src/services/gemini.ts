/**
 * Gemini API 客戶端 - 透過後端代理呼叫，不暴露 API Key
 * 當需要 AI 功能時，使用此模組呼叫 /api/gemini
 */

const API_BASE = "/api/gemini";

export interface GenerateContentRequest {
  contents: Array<{
    role?: string;
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
}

export async function generateContent(request: GenerateContentRequest, model = "gemini-2.0-flash") {
  const res = await fetch(`${API_BASE}?model=${encodeURIComponent(model)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API 錯誤: ${err}`);
  }

  return res.json();
}
