import { useState } from "react";
import { Button, Card, monoBoxClass, Note, rowClass } from "./ui.tsx";

type CopyState = "idle" | "copied" | "failed";

const COPY_LABELS: Record<CopyState, string> = {
  idle: "Prompt'u kopyala",
  copied: "Kopyalandı ✓",
  failed: "Kopyalanamadı, elle seç",
};

export function PromptCard({ prompt }: { prompt: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <Card title="3 · AI'ye Atacağın Prompt">
      <Note className="mb-2.5">
        Bu prompt'u kullanırsan, yapay zekanın cevabını doğrudan kopyalayıp 4. adımdaki kutuya yapıştırabilirsin —
        format uyuşursa ekstra düzenlemeye gerek kalmaz.
      </Note>
      <div className={rowClass}>
        <Button variant="secondary" onClick={copy}>
          {COPY_LABELS[copyState]}
        </Button>
      </div>
      <details className="group mt-2.5">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[0.82rem] text-fg-dim select-none hover:text-fg [&::-webkit-details-marker]:hidden">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>
          <span className="group-open:hidden">Prompt'u göster</span>
          <span className="hidden group-open:inline">Prompt'u gizle</span>
        </summary>
        <div className={`${monoBoxClass} mt-2 cursor-text select-text`}>{prompt}</div>
      </details>
      <Note className="mt-2.5">Parametre listesi ve aralıklar seçili eklentilere göre otomatik değişir.</Note>
    </Card>
  );
}
