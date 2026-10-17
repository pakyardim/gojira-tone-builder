import { useCallback, useRef, useState } from "react";
import { askGemini, GEMINI_MODEL, loadGeminiKey, saveGeminiKey, verifyGeminiKey } from "../lib/gemini.ts";

export interface Ai {
  /** True once a Gemini key is set; without one the page works by copy & paste. */
  usable: boolean;
  providerLabel: string;
  /** Verifies and stores the key; throws with a readable message when it does not work. */
  setGeminiKey: (key: string) => Promise<void>;
  clearGeminiKey: () => void;
  busy: boolean;
  ask: (prompt: string, onText?: (text: string) => void) => Promise<string>;
  cancel: () => void;
}

export function useAi(): Ai {
  const [geminiKey, setKey] = useState(loadGeminiKey);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const ask = useCallback(
    async (prompt: string, onText?: (text: string) => void) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setBusy(true);
      try {
        return await askGemini(prompt, { apiKey: geminiKey, signal: current.signal, onText });
      } finally {
        if (controller.current === current) controller.current = null;
        setBusy(false);
      }
    },
    [geminiKey],
  );

  const setGeminiKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    await verifyGeminiKey(trimmed);
    saveGeminiKey(trimmed);
    setKey(trimmed);
  }, []);

  const clearGeminiKey = useCallback(() => {
    saveGeminiKey("");
    setKey("");
  }, []);

  const cancel = useCallback(() => controller.current?.abort(), []);

  return {
    usable: Boolean(geminiKey),
    providerLabel: `Gemini (${GEMINI_MODEL})`,
    setGeminiKey,
    clearGeminiKey,
    busy,
    ask,
    cancel,
  };
}
