import { buildChannelStrip, type ChannelStripEdits } from "./cst.ts";
import { CHANNEL_EQ, COMPRESSOR, NOISE_GATE, type Module } from "./modules.ts";
import { resolveValue, type Param, type ResolvedValue, type StoredValue, type Target } from "./params.ts";
import { buildGojiraPreset } from "./preset.ts";
import { patchPst } from "./pst.ts";
import type { ParsedSetting } from "./settings.ts";
import type { Amp } from "./tone.ts";

export interface AppliedSetting {
  module: Module;
  param: Param;
  input: number;
  resolved: ResolvedValue;
}

export interface OutputFile {
  fileName: string;
  bytes: Uint8Array<ArrayBuffer>;
  plugin?: string;
}

export interface Generation {
  files: OutputFile[];
  applied: AppliedSetting[];
  unknown: string[];
  invalid: ParsedSetting[];
  missing: Module[];
}

const writesFor = (applied: AppliedSetting[]): [Target, StoredValue][] => [
  ...applied.flatMap((a) => a.param.sets ?? []),
  ...applied.map((a): [Target, StoredValue] => [a.param.target, a.resolved.stored]),
];

// Gojira X's output gain is stored in dB (its Default preset has 8); every generated preset gets -3.
const GOJIRA_OUTPUT_GAIN: [string, StoredValue] = ["outputGain", -3];

export const safeFileName = (name: string) => name.replace(/[/\\:*?"<>|]/g, "-");

export function generate(amp: Amp, modules: Module[], settings: ParsedSetting[], name: string): Generation {
  const lookup = new Map(
    modules.flatMap((module) => module.params.map((param) => [param.name, { module, param }] as const)),
  );
  const unknown: string[] = [];
  const invalid: ParsedSetting[] = [];
  const byName = new Map<string, AppliedSetting>();

  for (const setting of settings) {
    const hit = lookup.get(setting.name);
    if (!hit) {
      unknown.push(setting.name);
      continue;
    }
    const resolved = resolveValue(hit.param, setting.value);
    if (!resolved) {
      invalid.push(setting);
      continue;
    }
    byName.set(setting.name, { ...hit, input: setting.value, resolved });
  }

  const applied = [...byName.values()];
  const files: OutputFile[] = [];
  const missing: Module[] = [];
  const base = safeFileName(name);

  const gojiraApplied = applied.filter((a) => a.module.output.kind === "gojira");
  const gojiraValues = [GOJIRA_OUTPUT_GAIN, ...writesFor(gojiraApplied)] as [string, StoredValue][];

  const pstValues = new Map<Module, [number, number][]>();
  for (const module of modules) {
    const { output } = module;
    if (output.kind !== "pst") continue;
    const own = applied.filter((a) => a.module === module);
    if (own.length === 0) {
      missing.push(module);
      continue;
    }
    pstValues.set(
      module,
      [...(output.fixed ?? []), ...writesFor(own)].map(([index, value]): [number, number] => [
        index as number,
        Number(value),
      ]),
    );
  }

  // With the whole Noise Gate → Gojira X → Channel EQ → Compressor chain, one channel strip file replaces them all.
  const strip = [NOISE_GATE, CHANNEL_EQ, COMPRESSOR].map((m) => ({ module: m, values: pstValues.get(m) }));
  if (gojiraApplied.length && strip.every((s) => s.values)) {
    const pst = strip.map(({ module, values }) => ({
      defaults: (module.output as Extract<Module["output"], { kind: "pst" }>).template,
      values: values!,
    })) as ChannelStripEdits["pst"];
    const attributes: [string, StoredValue][] = [
      ["selectedAmp", amp.presetIndex],
      ["selectedCab", amp.presetIndex],
      // The template points at the Black Sabbath factory preset, whose name the plug-in would keep showing.
      ["presetUid", 0],
      ...gojiraValues,
    ];
    files.push({
      fileName: `${base}.cst`,
      bytes: buildChannelStrip({
        pst,
        archetype: (precision) =>
          attributes.map(([property, value]) => [
            property,
            typeof value === "boolean" ? String(value) : String(Number(value.toPrecision(precision))),
          ]),
      }),
      plugin: "Channel Strip",
    });
    return { files, applied, unknown, invalid, missing };
  }

  if (gojiraApplied.length) {
    files.push({
      fileName: `${base}.xml`,
      bytes: buildGojiraPreset(amp, name, gojiraValues),
    });
  }
  for (const [module, values] of pstValues) {
    const { output } = module;
    if (output.kind !== "pst") continue;
    files.push({
      fileName: `${base} - ${output.plugin}.pst`,
      bytes: patchPst(output.template, values),
      plugin: output.plugin,
    });
  }

  return { files, applied, unknown, invalid, missing };
}
