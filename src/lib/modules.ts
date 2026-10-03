import channelEqTemplateUrl from "../assets/logic-channel-eq-default.pst?inline";
import compressorTemplateUrl from "../assets/logic-compressor-default.pst?inline";
import noiseGateTemplateUrl from "../assets/logic-noise-gate-default.pst?inline";
import { decodeDataUrl } from "./binary.ts";
import { ON_OFF, type EnumOption, type Param, type Unit } from "./params.ts";
import type { Amp } from "./tone.ts";

export type OptionalModuleId = "channelEq" | "comp" | "gate";
export type ModuleId = "amp" | "gojiraPitch" | "gojiraPreFx" | "gojiraEq" | "gojiraPostFx" | OptionalModuleId;

export type ModuleOutput =
  | { kind: "gojira" }
  | {
      kind: "pst";
      plugin: string;
      template: Uint8Array;
      fixed?: [index: number, value: number][];
    };

export interface Module {
  id: ModuleId;
  title: string;
  params: Param[];
  output: ModuleOutput;
}

const pst = (
  name: string,
  label: string,
  unit: Unit,
  min: number,
  max: number,
  index: number,
  switchOn?: number,
): Param => ({
  name,
  label,
  unit,
  min,
  max,
  target: index,
  sets: switchOn === undefined ? undefined : [[switchOn, 1]],
});

export function ampModule(amp: Amp): Module {
  return {
    id: "amp",
    title: `Gojira X — ${amp.label} amfi`,
    params: amp.params,
    output: { kind: "gojira" },
  };
}

const GOJIRA_EQ_BANDS = ["65 Hz", "125 Hz", "250 Hz", "500 Hz", "1 kHz", "2 kHz", "4 kHz", "8 kHz", "16 kHz"];

export function gojiraEqModule(amp: Amp): Module {
  const p = amp.eqPrefix;
  return {
    id: "gojiraEq",
    title: `Gojira X — ${amp.label} EQ`,
    output: { kind: "gojira" },
    params: [
      ...GOJIRA_EQ_BANDS.map(
        (band, i): Param => ({
          name: `gx_eq_${band.replace(" ", "").toLowerCase()}`,
          label: `${amp.label} EQ ${band}`,
          unit: "dB",
          min: -12,
          max: 12,
          target: `${p}EQBand${i + 1}`,
        }),
      ),
      {
        name: "gx_eq_high_pass",
        label: `${amp.label} EQ High Pass`,
        unit: "Hz",
        min: 20,
        max: 500,
        target: `${p}EQHpf`,
        hint: "20 = kapalı",
      },
      {
        name: "gx_eq_low_pass",
        label: `${amp.label} EQ Low Pass`,
        unit: "Hz",
        min: 1000,
        max: 20000,
        target: `${p}EQLpf`,
        hint: "20000 = kapalı",
      },
    ],
  };
}

// Gojira X effects. Knobs are 0-1 internally, asked for as 0-100.
const pct = (name: string, label: string, target: string): Param => ({
  name,
  label,
  unit: "%",
  min: 0,
  max: 100,
  target,
  scale: 0.01,
});

/**
 * An effect's on/off switch plus its controls. The AI fills in every line, so the switch is
 * explicit; a control given without it still turns the effect on.
 */
function effect(key: string, label: string, activeTarget: string, controls: Param[]): Param[] {
  return [
    {
      name: `${key}_active`,
      label: `${label} Active`,
      unit: "",
      min: 0,
      max: 1,
      options: ON_OFF,
      target: activeTarget,
    },
    ...controls.map((c): Param => ({ ...c, sets: [...(c.sets ?? []), [activeTarget, true]] })),
  ];
}

const rate = (name: string, label: string, target: string): Param => ({
  name,
  label,
  unit: "Hz",
  min: 0.12,
  max: 10,
  target,
});

export const GOJIRA_PITCH: Module = {
  id: "gojiraPitch",
  title: "Gojira X — Pitch (WOW, OCT)",
  output: { kind: "gojira" },
  params: [
    ...effect("wow", "WOW", "whammyActive", [
      {
        name: "wow_mode",
        label: "WOW Mode",
        unit: "",
        min: 1,
        max: 3,
        target: "whammyMode",
        options: [
          { code: 1, label: "Fatso", value: 0 },
          { code: 2, label: "Blade 1", value: 1 },
          { code: 3, label: "Blade 2", value: 2 },
        ],
      },
      pct("wow_pedal", "WOW Pedal", "whammyPedal"),
      pct("wow_mix", "WOW Mix", "whammyMix"),
    ]),
    ...effect("oct", "OCT", "octaverActive", [
      pct("oct_oct1", "OCT Oct 1 Level", "octaverOct1"),
      pct("oct_oct2", "OCT Oct 2 Level", "octaverOct2"),
      pct("oct_direct", "OCT Direct Level", "octaverLevel"),
    ]),
  ],
};

export const GOJIRA_PRE_FX: Module = {
  id: "gojiraPreFx",
  title: "Gojira X — Pre FX (OD, DRT, PHSR, CHR)",
  output: { kind: "gojira" },
  params: [
    ...effect("od", "OD", "odActive", [
      pct("od_dist", "OD Dist", "odDist"),
      pct("od_tone", "OD Tone", "odTone"),
      pct("od_level", "OD Level", "odLevel"),
    ]),
    ...effect("drt", "DRT", "drtActive", [
      pct("drt_dist", "DRT Dist", "drtDist"),
      pct("drt_filter", "DRT Filter", "drtTone"),
      pct("drt_volume", "DRT Vol", "drtLevel"),
    ]),
    ...effect("phsr", "PHSR", "phsrActive", [rate("phsr_rate", "PHSR Rate", "phsrRate")]),
    ...effect("chr", "CHR", "chrActive", [
      rate("chr_rate", "CHR Rate", "chrRate"),
      pct("chr_depth", "CHR Depth", "chrDepth"),
      pct("chr_feedback", "CHR Feedback", "chrFeedback"),
      pct("chr_mix", "CHR Mix", "chrMix"),
    ]),
  ],
};

const DELAY_NOTES: EnumOption[] = [
  ["1/16", 7],
  ["1/8T", 8],
  ["1/8", 10],
  ["1/8D", 12],
  ["1/4T", 11],
  ["1/4", 13],
  ["1/4D", 15],
  ["1/2", 16],
  ["1/1", 19],
].map(([label, value], i) => ({
  code: i + 1,
  label: label as string,
  value: value as number,
}));

const DELAY_SYNC_FREE = 0;
const DELAY_SYNC_DAW = 1;

export const GOJIRA_POST_FX: Module = {
  id: "gojiraPostFx",
  title: "Gojira X — Post FX (DLY, REV)",
  output: { kind: "gojira" },
  params: [
    ...effect("dly", "DLY", "delayActive", [
      pct("dly_mix", "DLY Mix", "delayMix"),
      pct("dly_feedback", "DLY Feedback", "delayFeedback"),
      pct("dly_tone", "DLY Tone", "delayTone"),
      {
        name: "dly_time",
        label: "DLY Time",
        unit: "ms",
        min: 7,
        max: 3000,
        target: "delayTime",
        sets: [["delaySync", DELAY_SYNC_FREE]],
        hint: "dly_note'u verirsen bunu verme",
      },
      {
        name: "dly_note",
        label: "DLY Note",
        unit: "",
        min: 1,
        max: DELAY_NOTES.length,
        target: "delaySyncNote",
        options: DELAY_NOTES,
        sets: [["delaySync", DELAY_SYNC_DAW]],
        hint: "şarkının temposuna senkron",
      },
      {
        name: "dly_ping_pong",
        label: "DLY Ping Pong",
        unit: "",
        min: 0,
        max: 1,
        target: "delayPingPong",
        options: ON_OFF,
      },
      pct("dly_tape_sat", "DLY Tape Saturation", "delayTapeSat"),
      pct("dly_tape_mod", "DLY Tape Mod", "delayTapeMod"),
    ]),
    // Decay and the cuts are stored as 0-1 across these ranges (the Default preset's 0.384615 /
    // 0.0769231 / 0.777778 decode to exactly 4 s, 100 Hz and 8000 Hz).
    ...effect("rev", "REV", "reverbActive", [
      pct("rev_mix", "REV Mix", "reverbMix"),
      {
        name: "rev_decay",
        label: "REV Decay",
        unit: "s",
        min: 0.25,
        max: 10,
        target: "reverbDecay",
        offset: 0.25,
        scale: 1 / 9.75,
      },
      {
        name: "rev_low_cut",
        label: "REV Low Cut",
        unit: "Hz",
        min: 50,
        max: 700,
        target: "reverbLowCut",
        offset: 50,
        scale: 1 / 650,
      },
      {
        name: "rev_high_cut",
        label: "REV High Cut",
        unit: "Hz",
        min: 1000,
        max: 10000,
        target: "reverbHighCut",
        offset: 1000,
        scale: 1 / 9000,
      },
      {
        name: "rev_shimmer",
        label: "REV Shimmer",
        unit: "",
        min: 0,
        max: 1,
        target: "reverbShimmer",
        options: ON_OFF,
      },
    ]),
  ],
};

const SLOPES: EnumOption[] = [
  { code: 1, label: "12 dB/oct", value: 2 },
  { code: 2, label: "24 dB/oct", value: 4 },
];

const slope = (name: string, label: string, index: number, on: number): Param => ({
  name,
  label,
  unit: "",
  min: 1,
  max: 2,
  target: index,
  options: SLOPES,
  sets: [[on, 1]],
});

const peak = (n: number, on: number): Param[] => [
  pst(`ceq_peak${n}_freq`, `Peak ${n} Frequency`, "Hz", 20, 20000, on + 1, on),
  pst(`ceq_peak${n}_gain`, `Peak ${n} Gain`, "dB", -12, 12, on + 2, on),
  pst(`ceq_peak${n}_q`, `Peak ${n} Q`, "", 0.1, 10, on + 3, on),
];

export const CHANNEL_EQ: Module = {
  id: "channelEq",
  title: "Logic Channel EQ",
  output: {
    kind: "pst",
    plugin: "Channel EQ",
    template: decodeDataUrl(channelEqTemplateUrl),
    // Analyzer off (its range changes the graph's dB axis), Q-Couple off so the Q the AI gives is the Q you get.
    fixed: [
      [33, 0],
      [41, 0],
    ],
  },
  params: [
    {
      ...pst("ceq_low_cut", "Low Cut Frequency", "Hz", 20, 1000, 1, 0),
      hint: "20 = kapalı",
    },
    slope("ceq_low_cut_slope", "Low Cut Slope", 2, 0),
    pst("ceq_low_shelf_freq", "Low Shelf Frequency", "Hz", 20, 1000, 5, 4),
    pst("ceq_low_shelf_gain", "Low Shelf Gain", "dB", -12, 12, 6, 4),
    pst("ceq_low_shelf_q", "Low Shelf Q", "", 0.1, 10, 7, 4),
    ...peak(1, 8),
    ...peak(2, 12),
    ...peak(3, 16),
    ...peak(4, 20),
    pst("ceq_high_shelf_freq", "High Shelf Frequency", "Hz", 1000, 20000, 25, 24),
    pst("ceq_high_shelf_gain", "High Shelf Gain", "dB", -12, 12, 26, 24),
    pst("ceq_high_shelf_q", "High Shelf Q", "", 0.1, 10, 27, 24),
    {
      ...pst("ceq_high_cut", "High Cut Frequency", "Hz", 1000, 20000, 29, 28),
      hint: "20000 = kapalı",
    },
    slope("ceq_high_cut_slope", "High Cut Slope", 30, 28),
  ],
};

export const COMPRESSOR: Module = {
  id: "comp",
  title: "Logic Compressor",
  output: {
    kind: "pst",
    plugin: "Compressor",
    template: decodeDataUrl(compressorTemplateUrl),
    // Auto Gain off, so the make-up gain the AI gives is the gain you get.
    fixed: [[7, 0]],
  },
  params: [
    {
      name: "comp_circuit",
      label: "Circuit Type",
      unit: "",
      min: 1,
      max: 7,
      target: 9,
      options: [
        { code: 1, label: "Platinum Digital", value: 0 },
        { code: 2, label: "Studio VCA", value: 1 },
        { code: 3, label: "Studio FET", value: 2 },
        { code: 4, label: "Classic VCA", value: 8 },
        { code: 5, label: "Vintage VCA", value: 4 },
        { code: 6, label: "Vintage FET", value: 5 },
        { code: 7, label: "Vintage Opto", value: 6 },
      ],
    },
    pst("comp_threshold", "Threshold", "dB", -50, 0, 0),
    pst("comp_ratio", "Ratio", "", 1, 30, 1),
    pst("comp_attack", "Attack", "ms", 0, 200, 2),
    pst("comp_release", "Release", "ms", 5, 5000, 3),
    pst("comp_makeup_gain", "Make Up Gain", "dB", -20, 20, 4),
    pst("comp_knee", "Knee", "", 0, 1, 5),
    pst("comp_mix", "Mix", "%", 0, 100, 24),
  ],
};

export const NOISE_GATE: Module = {
  id: "gate",
  title: "Logic Noise Gate",
  output: {
    kind: "pst",
    plugin: "Noise Gate",
    template: decodeDataUrl(noiseGateTemplateUrl),
  },
  params: [
    pst("logic_gate_threshold", "Threshold", "dB", -80, 0, 0),
    pst("logic_gate_reduction", "Reduction", "dB", -100, 0, 2),
    pst("logic_gate_attack", "Attack", "ms", 0, 20, 3),
    pst("logic_gate_hold", "Hold", "ms", 0, 500, 4),
    pst("logic_gate_release", "Release", "ms", 2, 1000, 5),
    pst("logic_gate_hysteresis", "Hysteresis", "dB", -20, 0, 1),
  ],
};

export interface OptionalModuleInfo {
  id: OptionalModuleId;
  title: string;
  description: string;
}

export const OPTIONAL_MODULES: OptionalModuleInfo[] = [
  {
    id: "channelEq",
    title: "Logic Channel EQ",
    description: "Parametrik EQ: low/high cut ve eğimleri, shelf'ler, 4 peak bandı (Q dahil).",
  },
  {
    id: "comp",
    title: "Logic Compressor",
    description: "Gojira X'te kompresör yok. Devre tipi, threshold, ratio, attack, release…",
  },
  {
    id: "gate",
    title: "Logic Noise Gate",
    description: "Gojira X'in gate'ine ek, daha ayrıntılı ikinci bir gate.",
  },
];

export function modulesFor(amp: Amp, enabled: ReadonlySet<OptionalModuleId>): Module[] {
  const chain: Module[] = [];
  if (enabled.has("gate")) chain.push(NOISE_GATE);
  chain.push(GOJIRA_PITCH, GOJIRA_PRE_FX, ampModule(amp), gojiraEqModule(amp), GOJIRA_POST_FX);
  if (enabled.has("channelEq")) chain.push(CHANNEL_EQ);
  if (enabled.has("comp")) chain.push(COMPRESSOR);
  return chain;
}

const MODULES_KEY = "gojira-modules";

export function loadEnabledModules(): Set<OptionalModuleId> {
  try {
    const stored = JSON.parse(localStorage.getItem(MODULES_KEY) ?? "[]") as unknown;
    if (Array.isArray(stored)) {
      return new Set(OPTIONAL_MODULES.map((m) => m.id).filter((id) => stored.includes(id)));
    }
  } catch {
    // storage unavailable or corrupt
  }
  return new Set();
}

export function saveEnabledModules(enabled: ReadonlySet<OptionalModuleId>) {
  try {
    localStorage.setItem(MODULES_KEY, JSON.stringify([...enabled]));
  } catch {
    // storage unavailable
  }
}
