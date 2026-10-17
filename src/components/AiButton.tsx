import { useState } from "react";
import type { BuiltinAi } from "../hooks/useBuiltinAi.ts";
import { Button } from "./ui.tsx";

interface Props {
  ai: BuiltinAi;
  label: string;
  prompt: string;
  /** Receives the answer as it streams in. */
  onText: (text: string) => void;
  onDone?: (answer: string) => void;
  disabled?: boolean;
}

function errorMessage(err: unknown): string {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  switch (name) {
    case "AbortError":
      return "Durduruldu.";
    case "NotSupportedError":
      return "Yerleşik AI bu isteği desteklemedi (Türkçe resmi olarak desteklenmiyor). Kopyala-yapıştır ile devam edebilirsin.";
    case "QuotaExceededError":
      return "Prompt yerleşik AI için çok uzun. Kopyala-yapıştır ile devam edebilirsin.";
    case "NotAllowedError":
      return "Chrome model indirmesine izin vermedi; butona tekrar bas.";
    default:
      return `Yerleşik AI hata verdi: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** "Ask the built-in AI" button; renders nothing when the browser has no usable built-in AI. */
export function AiButton({ ai, label, prompt, onText, onDone, disabled }: Props) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ai.usable) return null;

  const run = async () => {
    setError(null);
    setRunning(true);
    try {
      const answer = await ai.ask(prompt, onText);
      onDone?.(answer);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      {running ? (
        <Button variant="secondary" onClick={ai.cancel}>
          Durdur
        </Button>
      ) : (
        <Button onClick={run} disabled={disabled || ai.busy}>
          ✦ {label}
        </Button>
      )}
      {running && (
        <span className="text-[0.8rem] text-fg-dim">
          {ai.download !== null ? `Model indiriliyor… %${Math.round(ai.download * 100)}` : "AI yazıyor…"}
        </span>
      )}
      {error && <p className="basis-full text-[0.78rem] leading-[1.6] text-accent">{error}</p>}
    </>
  );
}

/** One line under the page title saying whether the built-in AI can be used. */
export function AiStatusNote({ ai }: { ai: BuiltinAi }) {
  const text: Record<BuiltinAi["status"], string | null> = {
    checking: null,
    available:
      "✦ Tarayıcındaki yerleşik AI (Gemini Nano) hazır: 2. ve 5. adımdaki ✦ butonları kopyala-yapıştır yapmadan doldurur. Ücretsizdir ve cihazında çalışır.",
    downloadable:
      "✦ Tarayıcındaki yerleşik AI (Gemini Nano) kullanılabilir: ilk kullanımda Chrome modeli bir kez indirir (birkaç GB), sonra cihazında ücretsiz çalışır.",
    downloading: "✦ Chrome yerleşik AI modelini indiriyor; bitince ✦ butonlarıyla doğrudan kullanabilirsin.",
    unavailable:
      "Chrome'un yerleşik AI'si bu cihazda şu an kullanılamıyor (genelde yetersiz boş disk alanı — en az 22 GB — ya da donanım). Ayrıntı: chrome://on-device-internals. Kopyala-yapıştır ile devam edebilirsin.",
    unsupported:
      "Bu tarayıcıda yerleşik AI yok (masaüstünde güncel Chrome gerekir). Prompt'ları kopyalayıp istediğin AI'ye yapıştırarak devam edebilirsin.",
  };
  const message = text[ai.status];
  if (!message) return null;
  return (
    <p className={`-mt-3 mb-5 text-[0.78rem] leading-[1.6] ${ai.usable ? "text-ok" : "text-fg-dim"}`}>{message}</p>
  );
}
