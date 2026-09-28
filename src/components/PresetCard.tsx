import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "../hooks/useLog.ts";
import { Button, Card, fieldClass, monoBoxClass, Note, rowClass } from "./ui.tsx";

interface Props {
  entries: LogEntry[];
  chain: string[];
  name: string;
  onNameChange: (name: string) => void;
  onNameReset?: () => void;
  onDownload: (text: string) => void;
  onClearLog: () => void;
}

const PLACEHOLDER = `gain: 72
bass: 45
mid: 55
treble: 62
presence: 50
noise_gate_threshold: -60`;

const KIND_CLASS = { hit: "text-ok", miss: "text-accent" } as const;

export function PresetCard({ entries, chain, name, onNameChange, onNameReset, onDownload, onClearLog }: Props) {
  const logicPlugins = chain.filter((p) => p !== "Gojira X");
  const [text, setText] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <Card title="4 · Dosyaları Oluştur">
      <textarea
        className={`${fieldClass} block min-h-32.5 w-full resize-y font-mono leading-normal`}
        placeholder={PLACEHOLDER}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="AI'nin verdiği ayarlar"
      />
      <div className={`${rowClass} mt-2.5`}>
        <div className="relative min-w-45 flex-1">
          <input
            className={`${fieldClass} w-full ${onNameReset ? "pr-9" : ""}`}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Preset adı"
            aria-label="Preset adı"
          />
          {onNameReset && (
            <button
              type="button"
              onClick={onNameReset}
              title="Şarkı adına dön"
              aria-label="Preset adını şarkı adına döndür"
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded px-1 text-[1rem] text-fg-dim hover:text-accent"
            >
              ↺
            </button>
          )}
        </div>
        <Button onClick={() => onDownload(text)}>{logicPlugins.length ? "Zip olarak indir" : "Preset indir"}</Button>
        <Button variant="secondary" onClick={onClearLog}>
          Log'u temizle
        </Button>
      </div>
      <div ref={logRef} className={`${monoBoxClass} mt-2.5 max-h-50 overflow-y-auto`}>
        {entries.length === 0
          ? "Henüz dosya oluşturulmadı."
          : entries.map((e) => (
              <div key={e.id} className={e.kind && KIND_CLASS[e.kind]}>
                {e.text}
              </div>
            ))}
      </div>
      <Note className="mt-2.5">
        <b className="text-fg">Gojira X preset'i (.xml):</b> Üstteki preset çubuğunda <b>SAVE AS...</b>'nın yanındaki{" "}
        <b>⋮</b> → <b>IMPORT</b>'a bas ve dosyayı seç. AI'nin vermediği ayarlar Gojira X'in Default preset'indeki gibi
        kalır.
      </Note>
      {logicPlugins.length > 0 && (
        <Note className="mt-2">
          <b className="text-fg">Logic eklentileri (.pst):</b> Kanal şeridine {logicPlugins.join(", ")} ekle; sıra{" "}
          <b>{chain.join(" → ")}</b> olsun. Her eklentinin penceresinin üstündeki ayar menüsünden (<b>#default</b>{" "}
          yazan) <b>Load</b>'a bas ve o eklentinin dosyasını seç. Birden fazla dosya olduğunda hepsi tek bir <b>.zip</b>{" "}
          içinde iner; önce zip'i aç (çift tıkla).
        </Note>
      )}
    </Card>
  );
}
