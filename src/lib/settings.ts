export interface ParsedSetting {
  name: string;
  value: number;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function parseSettingsText(text: string): ParsedSetting[] {
  const result: ParsedSetting[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([a-zA-Z0-9_ ]+?)\s*[:=]\s*([-0-9.]+)/);
    if (m) {
      const value = parseFloat(m[2]);
      if (Number.isFinite(value)) {
        result.push({
          name: m[1].trim().toLowerCase().replace(/\s+/g, "_"),
          value,
        });
      }
    }
  }
  return result;
}
