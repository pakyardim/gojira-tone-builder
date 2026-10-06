import { useState } from "react";
import { buildAnalysisPrompt, newSection, parseSectionsText, type ToneSection } from "../lib/sections.ts";
import type { Song } from "../lib/song.ts";
import { AMPS, type AmpId } from "../lib/tone.ts";
import { Button, Card, fieldClass, Note, rowClass } from "./ui.tsx";

interface Props {
  song: Song;
  sections: ToneSection[];
  onChange: (sections: ToneSection[]) => void;
}

type CopyState = "idle" | "copied" | "failed";

const COPY_LABELS: Record<CopyState, string> = {
  idle: "Analiz prompt'unu kopyala",
  copied: "Kopyalandı ✓",
  failed: "Kopyalanamadı",
};

export function SectionsCard({ song, sections, onChange }: Props) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [text, setText] = useState("");
  const [parseFailed, setParseFailed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildAnalysisPrompt(song));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
    }
  };

  const load = () => {
    const parsed = parseSectionsText(text);
    setParseFailed(parsed.length === 0);
    if (parsed.length === 0) return;
    onChange(parsed);
    setText("");
  };

  const update = (id: number, patch: Partial<ToneSection>) =>
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const selectedCount = sections.filter((s) => s.selected).length;

  return (
    <Card title="2 · Tonlar (isteğe bağlı)">
      <Note className="mb-2.5">
        Şarkıda temiz, distortionlı ve solo gibi farklı tonlar varsa AI'ye şarkıyı bölümlere ayırtıp her bölüm için ayrı
        ton isteyebilirsin. Aşağıdaki prompt'u AI'ye ver, cevabı yapıştır; çıkan bölümlerden istediklerini seç. Hiç
        bölüm seçmezsen tek bir ton istenir.
      </Note>
      <div className={rowClass}>
        <Button variant="secondary" onClick={copy}>
          {COPY_LABELS[copyState]}
        </Button>
        <Button variant="secondary" onClick={() => onChange([...sections, newSection(`Bölüm ${sections.length + 1}`)])}>
          Elle bölüm ekle
        </Button>
      </div>
      <textarea
        className={`${fieldClass} mt-2.5 block min-h-20 w-full resize-y font-mono leading-normal`}
        placeholder={"Intro | CLN | chorus'lu temiz ton\nRiff | RST | sıkı, yüksek gain\nSolo | HOT | akıcı lead"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="AI'nin önerdiği bölümler"
      />
      <div className={`${rowClass} mt-2.5`}>
        <Button onClick={load} disabled={!text.trim()}>
          Bölümleri oluştur
        </Button>
        {sections.length > 0 && (
          <Button variant="secondary" onClick={() => onChange([])}>
            Bölümleri temizle
          </Button>
        )}
        {parseFailed && (
          <span className="text-[0.8rem] text-accent">"Ad | amfi | tarif" formatında satır bulunamadı.</span>
        )}
      </div>

      {sections.length > 0 && (
        <div className="mt-3.5 grid gap-2">
          {sections.map((s) => (
            <div
              key={s.id}
              className={`rounded-[9px] border px-3 py-2.5 ${s.selected ? "border-accent bg-accent-dim/40" : "border-border bg-surface-2"}`}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={s.selected}
                  onChange={(e) => update(s.id, { selected: e.target.checked })}
                  className="size-4 shrink-0 accent-accent"
                  aria-label={`${s.name} bölümünü dahil et`}
                />
                <input
                  className={`${fieldClass} min-w-32 flex-1`}
                  value={s.name}
                  onChange={(e) => update(s.id, { name: e.target.value })}
                  aria-label="Bölüm adı"
                />
                <select
                  className={fieldClass}
                  value={s.ampId}
                  onChange={(e) => update(s.id, { ampId: e.target.value as AmpId })}
                  aria-label="Amfi"
                >
                  {AMPS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} · {a.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChange(sections.filter((x) => x.id !== s.id))}
                  title="Bölümü sil"
                  aria-label={`${s.name} bölümünü sil`}
                  className="cursor-pointer rounded px-1 text-[1.1rem] text-fg-dim hover:text-accent"
                >
                  ×
                </button>
              </div>
              <input
                className={`${fieldClass} mt-2 w-full`}
                value={s.note}
                onChange={(e) => update(s.id, { note: e.target.value })}
                placeholder="Tonun kısa tarifi (prompt'a yazılır)"
                aria-label="Ton tarifi"
              />
            </div>
          ))}
        </div>
      )}
      {sections.length > 0 && (
        <Note className="mt-2.5">
          {selectedCount > 0
            ? `${selectedCount} bölüm seçili; prompt her biri için ayrı ayar isteyecek ve her bölüm ayrı dosya olacak.`
            : "Hiç bölüm seçili değil; tek bir ton istenecek."}
        </Note>
      )}
    </Card>
  );
}
