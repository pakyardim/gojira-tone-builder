import { songReference, type Song } from "./song.ts";
import { AMPS, type Amp, type AmpId } from "./tone.ts";

/** One part of a song that needs its own guitar tone (clean intro, heavy riff, solo...). */
export interface ToneSection {
  id: number;
  name: string;
  ampId: AmpId;
  note: string;
  selected: boolean;
}

let nextId = 0;

export const newSection = (name = "", ampId: AmpId = "rst", note = ""): ToneSection => ({
  id: nextId++,
  name,
  ampId,
  note,
  selected: true,
});

export const ampOf = (section: ToneSection): Amp => AMPS.find((a) => a.id === section.ampId) ?? AMPS[0];

const ampList = AMPS.map((a) => `${a.label}=${a.name.toLowerCase()}`).join(", ");

export function buildAnalysisPrompt(song: Song): string {
  return `${songReference(song)} şarkısındaki gitar partlarını dinlemiş gibi analiz et ve farklı gitar tonu gerektiren bölümlere ayır (ör. temiz intro, distortionlı ritim/riff, solo, breakdown). Birbirine yakın tonlu bölümleri tek bölümde birleştir; genelde 2-5 bölüm yeterlidir.
Her bölüm için amfi seç (${ampList}): temiz tonlar CLN, distortionlı ritim RST, solo/lead HOT.
Cevabını SADECE her satırda "Bölüm adı | amfi | tonun kısa tarifi" şeklinde ver, başka açıklama ekleme. Örnek:
Intro | CLN | chorus'lu, parlak temiz ton
Riff | RST | sıkı, bas ağırlıklı, yüksek gain`;
}

/** Reads the analysis answer: one `name | amp | note` line per section. */
export function parseSectionsText(text: string): ToneSection[] {
  const sections: ToneSection[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
      .split("|")
      .map((c) =>
        c
          .trim()
          .replace(/^\*+|\*+$/g, "")
          .trim(),
      );
    if (cells.length < 2 || !cells[0]) continue;
    const token = cells[1].toLowerCase();
    const amp = AMPS.find((a) => token.includes(a.label.toLowerCase()) || token.includes(a.name.toLowerCase()));
    if (!amp && cells.length < 3) continue;
    sections.push(newSection(cells[0], amp?.id ?? "rst", cells.slice(2).join(" | ")));
  }
  return sections;
}

const normalize = (s: string) => s.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}]/gu, "");

/** Splits the AI's answer into one text block per section, using the `## section name` headings. */
export function splitBySection(text: string, sections: ToneSection[]): Map<number, string> {
  const blocks = new Map<number, string[]>();
  let current: number | undefined;
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^\s*#{1,6}\s*(.+?)\s*#*\s*$/);
    if (heading) {
      const key = normalize(heading[1]);
      const hit = key
        ? (sections.find((s) => normalize(s.name) === key) ??
          sections.find((s) => key.includes(normalize(s.name)) || normalize(s.name).includes(key)))
        : undefined;
      if (hit) {
        current = hit.id;
        if (!blocks.has(hit.id)) blocks.set(hit.id, []);
        continue;
      }
    }
    if (current !== undefined) blocks.get(current)!.push(line);
  }
  return new Map([...blocks].map(([id, lines]) => [id, lines.join("\n")]));
}
