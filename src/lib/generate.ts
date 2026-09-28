import type { Module } from "./modules.ts";
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
  if (gojiraApplied.length) {
    const values = writesFor(gojiraApplied) as [string, StoredValue][];
    files.push({
      fileName: `${base}.xml`,
      bytes: buildGojiraPreset(amp, name, values),
    });
  }

  for (const module of modules) {
    const { output } = module;
    if (output.kind !== "pst") continue;
    const own = applied.filter((a) => a.module === module);
    if (own.length === 0) {
      missing.push(module);
      continue;
    }
    const values = [...(output.fixed ?? []), ...writesFor(own)].map(([index, value]): [number, number] => [
      index as number,
      Number(value),
    ]);
    files.push({
      fileName: `${base} - ${output.plugin}.pst`,
      bytes: patchPst(output.template, values),
      plugin: output.plugin,
    });
  }

  return { files, applied, unknown, invalid, missing };
}
