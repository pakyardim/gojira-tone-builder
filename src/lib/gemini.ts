// Google Gemini API, called straight from the browser with the user's own key (the free tier is
// enough for this app). The key never leaves the browser except to Google.
// https://ai.google.dev/gemini-api/docs

/** Alias that always points at the newest Flash model, so the app needs no update when it changes. */
export const GEMINI_MODEL = "gemini-flash-latest";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const KEY_STORAGE = "gojira-gemini-key";

export const SYSTEM_PROMPT =
  "You are an experienced guitar tone engineer. Answer in exactly the format the user asks for: only the requested lines, no explanations, no markdown code fences.";

export function loadGeminiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function saveGeminiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // storage unavailable: the key only lasts for this page load
  }
}

async function apiError(res: Response): Promise<Error> {
  let message = "";
  try {
    message = ((await res.json()) as { error?: { message?: string } }).error?.message ?? "";
  } catch {
    // not JSON
  }
  if (res.status === 400 && /api key/i.test(message)) return new Error("Gemini API anahtarı geçersiz.");
  if (res.status === 403) return new Error("Bu API anahtarının Gemini API'ye erişim izni yok.");
  if (res.status === 429) {
    return new Error("Gemini ücretsiz kotası şu an dolu (dakikalık/günlük sınır). Biraz bekleyip tekrar dene.");
  }
  return new Error(`Gemini hata verdi (${res.status})${message ? `: ${message}` : ""}`);
}

/** Checks that the key works, without spending generation quota. */
export async function verifyGeminiKey(apiKey: string): Promise<void> {
  const res = await fetch(`${API}/${GEMINI_MODEL}`, { headers: { "x-goog-api-key": apiKey } });
  if (!res.ok) throw await apiError(res);
}

interface StreamChunk {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
}

/** Streams one answer; `onText` gets the full answer so far after every chunk. */
export async function askGemini(
  prompt: string,
  { apiKey, signal, onText }: { apiKey: string; signal?: AbortSignal; onText?: (text: string) => void },
): Promise<string> {
  const res = await fetch(`${API}/${GEMINI_MODEL}:streamGenerateContent?alt=sse`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // Default thinking made answers take 30 s to 2+ minutes; "low" answers in seconds.
      generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
    }),
  });
  if (!res.ok || !res.body) throw await apiError(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let text = "";
  let finishReason: string | undefined;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    // Server-sent events: one `data: {json}` line per chunk.
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const candidate = (JSON.parse(line.slice(5)) as StreamChunk).candidates?.[0];
      finishReason = candidate?.finishReason ?? finishReason;
      const piece = (candidate?.content?.parts ?? [])
        .filter((p) => !p.thought)
        .map((p) => p.text ?? "")
        .join("");
      if (piece) {
        text += piece;
        onText?.(text);
      }
    }
  }
  if (!text.trim()) {
    throw new Error(`Gemini boş cevap döndü${finishReason ? ` (${finishReason})` : ""}. Tekrar dene.`);
  }
  return text;
}
