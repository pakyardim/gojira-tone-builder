import defaultPresetDataUrl from "../assets/default-preset.bin?inline";
import { decodeDataUrl } from "./binary.ts";
import type { StoredValue } from "./params.ts";
import type { Amp } from "./tone.ts";
import { readValueTree, setStringProperty, writeValueTree } from "./valueTree.ts";

export const MIN_PRESET_NAME_LENGTH = 4;

const templateBytes = decodeDataUrl(defaultPresetDataUrl);

const formatNumber = (n: number) => String(Number(n.toPrecision(6)));

export function buildGojiraPreset(
  amp: Amp,
  name: string,
  values: [property: string, value: StoredValue][],
): Uint8Array<ArrayBuffer> {
  const tree = readValueTree(templateBytes);
  const set = (property: string, value: string) => {
    if (setStringProperty(tree, property, value) === 0) {
      throw new Error(`Temel preset'te "${property}" bulunamadı`);
    }
  };

  set("name", name);
  set("selectedAmp", String(amp.presetIndex));
  set("selectedCab", String(amp.presetIndex));
  for (const [property, value] of values)
    set(property, typeof value === "boolean" ? String(value) : formatNumber(value));

  return writeValueTree(tree);
}
