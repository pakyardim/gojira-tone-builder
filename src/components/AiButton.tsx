import { useState } from "react";
import type { Ai } from "../hooks/useAi.ts";
import { Button, fieldClass, rowClass } from "./ui.tsx";

interface Props {
  ai: Ai;
  label: string;
  prompt: string;
  /** Receives the answer as it streams in. */
  onText: (text: string) => void;
  onDone?: (answer: string) => void;
  disabled?: boolean;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.name === "AbortError") return "Durduruldu.";
  // Gemini errors already carry a readable Turkish message.
  return err instanceof Error ? err.message : `AI hata verdi: ${String(err)}`;
}

/** "Ask the AI" button; renders nothing until a Gemini key is set. */
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
          AI yazıyor…
        </span>
      )}
      {error && <p className="basis-full text-[0.78rem] leading-[1.6] text-accent">{error}</p>}
    </>
  );
}

/** Shows whether the ✦ buttons are connected to Gemini and lets the user add or remove the API key. */
export function AiSettings({ ai }: { ai: Ai }) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await ai.setGeminiKey(key);
      setKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="group mb-5 rounded-[9px] border border-border bg-surface px-4 py-2.5" open={!ai.usable}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.82rem] select-none [&::-webkit-details-marker]:hidden">
        <span className="inline-block text-fg-dim transition-transform group-open:rotate-90">▸</span>
        {ai.usable ? (
          <span className="text-ok">✦ AI bağlı: {ai.providerLabel} — 2. ve 5. adımdaki ✦ butonları doğrudan doldurur.</span>
        ) : (
          <span className="text-fg">AI bağla (isteğe bağlı) — bağlamazsan prompt'ları kopyala-yapıştır yaparsın.</span>
        )}
      </summary>
      <div className="mt-2.5 text-[0.78rem] leading-[1.6] text-fg-dim">
        {ai.usable ? (
          <div className={rowClass}>
            <span>Gemini API anahtarı bu tarayıcıda kayıtlı.</span>
            <Button variant="secondary" onClick={ai.clearGeminiKey}>
              Anahtarı kaldır
            </Button>
          </div>
        ) : (
          <>
            <p>
              Ücretsiz bir Gemini API anahtarı ile AI cevaplarını doğrudan alabilirsin:{" "}
              <a
                className="text-accent underline"
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                Google AI Studio
              </a>
              'dan bir anahtar oluştur (kredi kartı gerekmez) ve buraya yapıştır. Anahtar sadece bu tarayıcıda saklanır,
              yalnızca Google'a gönderilir.
            </p>
            <div className={`${rowClass} mt-2`}>
              <input
                type="password"
                className={`${fieldClass} min-w-56 flex-1`}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && key.trim() && save()}
                placeholder="Gemini API anahtarı (AIza…)"
                aria-label="Gemini API anahtarı"
                autoComplete="off"
              />
              <Button onClick={save} disabled={!key.trim() || saving}>
                {saving ? "Kontrol ediliyor…" : "Kaydet"}
              </Button>
            </div>
            {error && <p className="mt-1.5 text-accent">{error}</p>}
          </>
        )}
      </div>
    </details>
  );
}
