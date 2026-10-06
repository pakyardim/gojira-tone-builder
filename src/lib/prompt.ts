import { modulesFor, type Module, type OptionalModuleId } from "./modules.ts";
import { rangeText } from "./params.ts";
import { songReference, type Song } from "./song.ts";
import { ampOf, type ToneSection } from "./sections.ts";
import { AMP_CODES, AMP_PARAM } from "./tone.ts";

const moduleBlocks = (modules: Module[], heading = "#") =>
  modules.map((m) => `${heading} ${m.title}\n${m.params.map((p) => `${p.name}: ${rangeText(p)}`).join("\n")}`);

function notesAndRules(modules: Module[], pickAmp: boolean) {
  const params = modules.flatMap((m) => m.params);
  const usesLogic = modules.some((m) => m.output.kind === "pst");
  const chain = [...new Set(modules.map((m) => (m.output.kind === "gojira" ? "Archetype Gojira X" : m.title)))];

  const toneStages = [
    "amfinin bass/mid/treble/presence ayarları",
    modules.some((m) => m.id === "gojiraEq") && "Gojira X EQ",
    modules.some((m) => m.id === "channelEq") && "Logic Channel EQ",
  ].filter(Boolean);

  const notes = [
    pickAmp &&
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
  return { notes, rules };
}

export function buildPrompt(song: Song, modules: Module[]): string {
  const ampLine = `${AMP_PARAM}: [${AMP_CODES.map(({ code, amp }) => `${code}=${amp.label} ${amp.name.toLowerCase()}`).join(", ")}]`;
  const { notes, rules } = notesAndRules(modules, true);

  return `Neural DSP Archetype Gojira X ile ${songReference(song)} tarzında bir tona ihtiyacım var.${notes.map((n) => `\n${n}`).join("")}
Cevabını SADECE aşağıdaki formatta, her satırda "parametre_adı: sayısal_değer" şeklinde ver, başka açıklama ekleme:

# Amfi\n${ampLine}\n\n${moduleBlocks(modules).join("\n\n")}

${rules.join(" ")}`;
}

/** One prompt for several tones: each section gets its own amp and its own parameter block. */
export function buildSectionsPrompt(
  song: Song,
  sections: ToneSection[],
  enabled: ReadonlySet<OptionalModuleId>,
): string {
  const perSection = sections.map((s) => ({ section: s, amp: ampOf(s), modules: modulesFor(ampOf(s), enabled) }));
  const { notes, rules } = notesAndRules(
    perSection.flatMap((p) => p.modules),
    false,
  );
  const list = perSection
    .map(
      ({ section, amp }) =>
        `- ${section.name}: ${amp.label} amfisi (${amp.name.toLowerCase()})${section.note ? ` — ${section.note}` : ""}`,
    )
    .join("\n");
  const blocks = perSection
    .map(({ section, modules }) => `## ${section.name}\n\n${moduleBlocks(modules, "###").join("\n\n")}`)
    .join("\n\n\n");

  return `Neural DSP Archetype Gojira X ile ${songReference(song)} şarkısı için ${sections.length} ayrı gitar tonuna ihtiyacım var; her bölüme ayrı ayar ver.
Bölümler ve amfileri (amfiler sabit, değiştirme; sadece o amfide bulunan parametreleri yaz, CLN'de presence, depth ve master yok):
${list}${notes.map((n) => `\n${n}`).join("")}
Cevabını SADECE aşağıdaki formatta ver: her bölüm "## Bölüm adı" başlığıyla başlasın (adı aynen yaz), altında her satırda "parametre_adı: sayısal_değer" olsun, başka açıklama ekleme:

${blocks}

${rules.join(" ")}`;
}
