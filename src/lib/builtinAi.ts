// Chrome's built-in AI (Prompt API, Gemini Nano): free, runs on the device, needs no API key.
// https://developer.chrome.com/docs/ai/prompt-api
// Only the parts this app uses are typed here; the API is not in TypeScript's DOM types.

export type AiStatus = "unsupported" | "unavailable" | "downloadable" | "downloading" | "available";

interface LanguageModelSession {
  promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(): Promise<Exclude<AiStatus, "unsupported">>;
  create(options?: {
    initialPrompts?: { role: "system" | "user" | "assistant"; content: string }[];
    monitor?: (monitor: EventTarget) => void;
    signal?: AbortSignal;
  }): Promise<LanguageModelSession>;
}

const languageModel = () => (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;

export async function getAiStatus(): Promise<AiStatus> {
  const api = languageModel();
  if (!api) return "unsupported";
  try {
    return await api.availability();
  } catch {
    return "unavailable";
  }
}

const SYSTEM_PROMPT =
  "You are an experienced guitar tone engineer. Answer in exactly the format the user asks for: only the requested lines, no explanations, no markdown code fences.";

export interface AskOptions {
  signal?: AbortSignal;
  /** 0-1 while the model is being downloaded (first use only). */
  onDownloadProgress?: (fraction: number) => void;
  /** The answer so far, as it streams in. */
  onText?: (text: string) => void;
}

/**
 * Sends one prompt in a fresh session and returns the full answer. When the model still has to be
 * downloaded, Chrome only allows this right after a user action, so call it from a click handler.
 */
export async function askBuiltinAi(prompt: string, { signal, onDownloadProgress, onText }: AskOptions = {}): Promise<string> {
  const api = languageModel();
  if (!api) throw new Error("Bu tarayıcıda yerleşik AI yok.");

  const session = await api.create({
    initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
    signal,
    monitor: (m) =>
      m.addEventListener("downloadprogress", (e) => onDownloadProgress?.((e as ProgressEvent).loaded)),
  });
  try {
    let text = "";
    const reader = session.promptStreaming(prompt, { signal }).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += value;
      onText?.(text);
    }
    return text;
  } finally {
    session.destroy();
  }
}
