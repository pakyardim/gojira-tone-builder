import { clamp } from "./settings.ts";

export type Unit = "" | "%" | "dB" | "Hz" | "ms" | "s";

export type Target = string | number;

export type StoredValue = number | boolean;

export interface EnumOption {
  code: number;
  label: string;
  value: StoredValue;
}

export interface Param {
  name: string;
  label: string;
  unit: Unit;
  min: number;
  max: number;
  options?: EnumOption[];
  target: Target;
  offset?: number;
  scale?: number;
  sets?: [target: Target, value: StoredValue][];
  hint?: string;
}

export interface ResolvedValue {
  value: number;
  stored: StoredValue;
  clamped: boolean;
  display: string;
}

export const ON_OFF: EnumOption[] = [
  { code: 0, label: "kapalı", value: false },
  { code: 1, label: "açık", value: true },
];

export function rangeText(p: Param): string {
  const hint = p.hint ? ` (${p.hint})` : "";
  if (p.options) return `[${p.options.map((o) => `${o.code}=${o.label}`).join(", ")}]${hint}`;
  const unit = p.unit && p.unit !== "%" ? `, ${p.unit}` : "";
  if (p.min < 0 || unit) return `[${p.min} ile ${p.max} arası${unit}]${hint}`;
  return `[${p.min}-${p.max}]${hint}`;
}

export function resolveValue(p: Param, input: number): ResolvedValue | null {
  if (p.options) {
    const option = p.options.find((o) => o.code === Math.round(input));
    return option
      ? {
          value: option.code,
          stored: option.value,
          clamped: false,
          display: option.label,
        }
      : null;
  }
  const value = clamp(input, p.min, p.max);
  const unit = p.unit === "%" ? "%" : p.unit ? ` ${p.unit}` : "";
  return {
    value,
    stored: (value - (p.offset ?? 0)) * (p.scale ?? 1),
    clamped: value !== input,
    display: `${value}${unit}`,
  };
}
