export interface Song {
  title: string;
  artist: string;
}

export const FALLBACK_PRESET_NAME = "AI Tone";

export function presetNameFor({ title, artist }: Song): string {
  const parts = [title.trim(), artist.trim()].filter(Boolean);
  return parts.length ? parts.join(" - ") : FALLBACK_PRESET_NAME;
}

export function songReference({ title, artist }: Song): string {
  return `${title.trim() || "[ŞARKI ADI]"} - ${artist.trim() || "[SANATÇI]"}`;
}
