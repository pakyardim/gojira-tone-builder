import { useMemo, useState } from "react";
import { AmpCard } from "./components/AmpCard.tsx";
import { PresetCard } from "./components/PresetCard.tsx";
import { PromptCard } from "./components/PromptCard.tsx";
import { SongCard } from "./components/SongCard.tsx";
import { useLog } from "./hooks/useLog.ts";
import { downloadFile, packageFiles } from "./lib/download.ts";
import { generate, safeFileName, type Generation, type OutputFile } from "./lib/generate.ts";
import { loadEnabledModules, modulesFor, saveEnabledModules, type OptionalModuleId } from "./lib/modules.ts";
import { MIN_PRESET_NAME_LENGTH } from "./lib/preset.ts";
import { buildPrompt } from "./lib/prompt.ts";
import { parseSettingsText } from "./lib/settings.ts";
import { presetNameFor, type Song } from "./lib/song.ts";
import { AMPS, loadAmp, saveAmp, type AmpId } from "./lib/tone.ts";

export default function App() {
  const { entries, log, clear } = useLog();
  const [amp, setAmp] = useState<AmpId>(loadAmp);
  const [enabled, setEnabled] = useState(loadEnabledModules);
  const [song, setSong] = useState<Song>({ title: "", artist: "" });
  const [customName, setCustomName] = useState<string | null>(null);

  const currentAmp = AMPS.find((a) => a.id === amp)!;
  const modules = useMemo(() => modulesFor(currentAmp, enabled), [currentAmp, enabled]);
  const prompt = useMemo(() => buildPrompt(song, currentAmp, modules), [song, currentAmp, modules]);
  const autoName = presetNameFor(song);
  const presetName = customName ?? autoName;
  const chain = [...new Set(modules.map((m) => (m.output.kind === "pst" ? m.output.plugin : "Gojira X")))];

  const handleAmpChange = (next: AmpId) => {
    setAmp(next);
    saveAmp(next);
  };

  const handleToggle = (id: OptionalModuleId) => {
    const next = new Set(enabled);
    if (!next.delete(id)) next.add(id);
    setEnabled(next);
    saveEnabledModules(next);
  };

  const handleDownload = (text: string) => {
    const name = presetName.trim();
    if (name.length < MIN_PRESET_NAME_LENGTH) {
      log(`Preset adı en az ${MIN_PRESET_NAME_LENGTH} karakter olmalı.`, "miss");
      return;
    }
    const parsed = parseSettingsText(text);
    if (parsed.length === 0) {
      log("Metinde 'parametre: değer' formatında satır bulunamadı.", "miss");
      return;
    }

    let result: Generation;
    try {
      result = generate(currentAmp, modules, parsed, name);
    } catch (err) {
      log(`Dosyalar oluşturulamadı: ${err instanceof Error ? err.message : String(err)}`, "miss");
      return;
    }

    for (const unknown of result.unknown) {
      log(`— bilinmeyen parametre: "${unknown}" (seçili amfi/eklentilerde yok, atlandı)`, "miss");
    }
    for (const { name: paramName, value } of result.invalid) {
      log(`— geçersiz seçenek: ${paramName} = ${value} (atlandı)`, "miss");
    }
    for (const { module, param, input, resolved } of result.applied) {
      const label = module.output.kind === "pst" ? `${module.title} · ${param.label}` : param.label;
      const note = resolved.clamped ? `  (${input} aralık dışıydı)` : "";
      log(`✓ ${param.name} → ${label} = ${resolved.display}${note}`, "hit");
    }
    for (const module of result.missing) {
      log(`— ${module.title} için değer gelmedi, dosyası oluşturulmadı.`, "miss");
    }
    if (result.files.length === 0) {
      log("Seçili amfi/eklentilere uyan hiçbir parametre yok; dosya indirilmedi.", "miss");
      return;
    }

    const download = packageFiles(result.files, safeFileName(name));
    downloadFile(download);
    const howTo = (file: OutputFile) =>
      file.plugin ? `Logic ${file.plugin} → ayar menüsü → Load` : "Gojira X'te ⋮ → IMPORT";
    if (result.files.length === 1) {
      log(`✓ "${download.fileName}" indirildi → ${howTo(result.files[0])}`, "hit");
    } else {
      log(`✓ "${download.fileName}" indirildi (${result.files.length} dosya):`, "hit");
      for (const file of result.files) log(`    ${file.fileName} → ${howTo(file)}`, "hit");
    }
  };

  return (
    <div className="mx-auto max-w-190 px-5 pt-7 pb-15">
      <h1 className="mb-1 text-[1.4rem] font-bold tracking-[-0.01em]">Gojira X Tone Builder</h1>
      <p className="mb-6 text-[0.92rem] leading-normal text-fg-dim">
        AI'dan aldığın ayarları yapıştır; Archetype Gojira X preset'i ve istersen Logic'in Channel EQ, Compressor ve
        Noise Gate ayar dosyaları olarak indir. Her şey tarayıcında olur, hiçbir yere gönderilmez.
      </p>

      <SongCard song={song} onChange={setSong} />
      <AmpCard amp={amp} onAmpChange={handleAmpChange} enabled={enabled} onToggle={handleToggle} />
      <PromptCard prompt={prompt} />
      <PresetCard
        entries={entries}
        chain={chain}
        name={presetName}
        onNameChange={setCustomName}
        onNameReset={customName !== null && customName !== autoName ? () => setCustomName(null) : undefined}
        onDownload={handleDownload}
        onClearLog={clear}
      />
    </div>
  );
}
