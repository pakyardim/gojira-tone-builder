import { useCallback, useEffect, useRef, useState } from "react";
import { askBuiltinAi, getAiStatus, type AiStatus } from "../lib/builtinAi.ts";

export interface BuiltinAi {
  status: AiStatus | "checking";
  /** True when the AI can be asked (possibly after a one-time model download). */
  usable: boolean;
  busy: boolean;
  /** Download progress 0-1 while the model is being fetched, otherwise null. */
  download: number | null;
  ask: (prompt: string, onText?: (text: string) => void) => Promise<string>;
  cancel: () => void;
}

export function useBuiltinAi(): BuiltinAi {
  const [status, setStatus] = useState<AiStatus | "checking">("checking");
  const [busy, setBusy] = useState(false);
  const [download, setDownload] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    getAiStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);

  const ask = useCallback(async (prompt: string, onText?: (text: string) => void) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      const answer = await askBuiltinAi(prompt, {
        signal: current.signal,
        onText,
        onDownloadProgress: (f) => setDownload(f < 1 ? f : null),
      });
      setStatus("available");
      return answer;
    } finally {
      if (controller.current === current) controller.current = null;
      setBusy(false);
      setDownload(null);
    }
  }, []);

  const cancel = useCallback(() => controller.current?.abort(), []);

  const usable = status === "available" || status === "downloadable" || status === "downloading";
  return { status, usable, busy, download, ask, cancel };
}
