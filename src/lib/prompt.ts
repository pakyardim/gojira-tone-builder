import type { Module } from "./modules.ts";
import { rangeText } from "./params.ts";
import { songReference, type Song } from "./song.ts";
import { AMP_CODES, AMP_PARAM } from "./tone.ts";

export function buildPrompt(song: Song, modules: Module[]): string {
  const ampLine = `${AMP_PARAM}: [${AMP_CODES.map(({ code, amp }) => `${code}=${amp.label} ${amp.name.toLowerCase()}`).join(", ")}]`;
  const sections = modules.map((m) => `# ${m.title}\n${m.params.map((p) => `${p.name}: ${rangeText(p)}`).join("\n")}`);
  const params = modules.flatMap((m) => m.params);
  const usesLogic = modules.some((m) => m.output.kind === "pst");
  const chain = [...new Set(modules.map((m) => (m.output.kind === "gojira" ? "Archetype Gojira X" : m.title)))];

  const toneStages = [
    "amfinin bass/mid/treble/presence ayarları",
    modules.some((m) => m.id === "gojiraEq") && "Gojira X EQ",
    modules.some((m) => m.id === "channelEq") && "Logic Channel EQ",
  ].filter(Boolean);

  const notes = [
    "Amfiyi sen seç: ton distortionlı ritimse RST, solo/lead ise HOT, temiz bir tonsa CLN. Seçtiğin amfiye göre sadece o amfide bulunan parametreleri yaz (CLN'de presence, depth ve master yok).",
    usesLogic && `Logic Pro'daki sinyal zinciri: ${chain.join(" → ")}.`,
    toneStages.length > 1 &&
      `Ton ayarları seri bağlı ve etkileri toplanır: ${toneStages.join(" → ")}. Aynı frekansı, özellikle tizleri, birden fazla yerde kesme; gitar kabini zaten yüksek frekansları kısıyor, üst üste kesmek sesi boğuklaştırır. Her EQ'da bu tona özgü bir şekil ver: gereksiz bas ve cızırtıyı filtrelerle kes, bantları gerçekten kullan (genelde ±2-4 dB, Q değerleriyle birlikte); hepsini 0 dB bırakma.`,
    params.some((p) => p.name.endsWith("_active")) &&
      "*_active: 1 efekti açar, 0 kapatır; bu tona uymayan efektleri 0 yap (diğer değerlerini yine de yazabilirsin).",
  ].filter(Boolean);
  const rules = [
    "Sadece yukarıdaki parametre isimlerini kullan, farklı isim uydurma.",
    params.some((p) => p.options) && "Seçenekli parametrelerde sadece numarayı yaz.",
  ].filter(Boolean);

  return `Neural DSP Archetype Gojira X ile ${songReference(song)} tarzında bir tona ihtiyacım var.${notes.map((n) => `\n${n}`).join("")}
Cevabını SADECE aşağıdaki formatta, her satırda "parametre_adı: sayısal_değer" şeklinde ver, başka açıklama ekleme:

# Amfi\n${ampLine}\n\n${sections.join("\n\n")}

${rules.join(" ")}`;
}
