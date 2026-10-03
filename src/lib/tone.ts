import type { Param } from "./params.ts";

export type AmpId = "rst" | "hot" | "cln";

export interface Amp {
  id: AmpId;
  label: string;
  name: string;
  hint: string;
  presetIndex: number;
  eqPrefix: "clean" | "rhythm" | "lead";
  params: Param[];
}

const knob = (name: string, target: string, label: string): Param => ({
  name,
  label,
  unit: "%",
  min: 0,
  max: 100,
  target,
  scale: 0.01,
});

const GATE: Param = {
  name: "noise_gate_threshold",
  label: "Gate Threshold",
  unit: "dB",
  min: -96,
  max: 0,
  target: "gateThreshold",
};

const drivenAmpParams = (prefix: "rhythm" | "lead", label: string): Param[] => [
  knob("gain", `${prefix}AmpGain`, `${label} Amp Gain`),
  knob("bass", `${prefix}AmpLow`, `${label} Amp Bass`),
  knob("mid", `${prefix}AmpMid`, `${label} Amp Mid`),
  knob("treble", `${prefix}AmpHigh`, `${label} Amp Treble`),
  knob("presence", `${prefix}AmpPresence`, `${label} Amp Presence`),
  knob("depth", `${prefix}AmpDepth`, `${label} Amp Depth`),
  knob("master", `${prefix}AmpMaster`, `${label} Amp Master`),
  GATE,
];

export const AMPS: Amp[] = [
  {
    id: "rst",
    label: "RST",
    name: "Rhythm",
    hint: "Ritim amfisi: distortion, riff ve ritim partisyonları.",
    presetIndex: 1,
    eqPrefix: "rhythm",
    params: drivenAmpParams("rhythm", "RST"),
  },
  {
    id: "hot",
    label: "HOT",
    name: "Lead",
    hint: "Lead amfisi: solo ve lead partisyonları.",
    presetIndex: 2,
    eqPrefix: "lead",
    params: drivenAmpParams("lead", "HOT"),
  },
  {
    id: "cln",
    label: "CLN",
    name: "Clean",
    hint: "Temiz amfi: distortionsız, clean tonlar.",
    presetIndex: 0,
    eqPrefix: "clean",
    params: [
      knob("gain", "cleanAmpGain", "CLN Amp Gain"),
      knob("bass", "cleanAmpBass", "CLN Amp Bass"),
      knob("mid", "cleanAmpMid", "CLN Amp Mid"),
      knob("treble", "cleanAmpTreble", "CLN Amp Treble"),
      GATE,
    ],
  },
];

export const AMP_PARAM = "amp";

/** The `amp` line the AI fills in: 0-2 in AMPS order. */
export const AMP_CODES = AMPS.map((a, i) => ({ code: i, amp: a }));

export const DEFAULT_AMP: Amp = AMPS[0];

export function ampFromCode(code: number | undefined): Amp | undefined {
  return AMP_CODES.find((c) => c.code === Math.round(code ?? NaN))?.amp;
}
