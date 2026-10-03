# Gojira X Tone Builder

Paste tone settings from an AI (`gain: 72`, `comp_ratio: 4`, …) and download them as:

- a Neural DSP Archetype Gojira X preset covering the whole plugin (amp, gate, pitch effects,
  pre FX pedals, the amp's 9-band EQ, post FX delay/reverb), imported via preset bar → ⋮ → IMPORT
- optionally Logic Pro plug-in settings (`.pst`) for **Channel EQ**, **Compressor** and
  **Noise Gate**, loaded via each plug-in's settings menu → Load

When more than one file is produced they download together as a single `<name>.zip`.

Built with Vite, React, TypeScript and Tailwind CSS v4. Everything runs in the browser.

## Development

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check and build to dist/
npm run lint     # oxlint
```

## How the files are generated

Every file starts from a copy of the plug-in's own default and only the values the AI gave are
changed.

- **Gojira X** `.xml` presets are not XML: they are JUCE `ValueTree` binaries
  (format in [src/lib/valueTree.ts](src/lib/valueTree.ts)). Template:
  [src/assets/default-preset.bin](src/assets/default-preset.bin), copied from
  `/Library/Audio/Presets/Neural DSP/Archetype Gojira X/Default.xml` (v1.0.1).
- **Logic** `.pst` settings are a 28-byte header plus one float per parameter
  (format in [src/lib/pst.ts](src/lib/pst.ts)). Templates: `src/assets/logic-*-default.pst`, copied
  from `Logic Pro.app/Contents/Resources/Plug-In Settings/<Plug-in>/#default.pst`. Parameter indices
  come from each plug-in's `CSParameterOrder.plist`, checked against Logic's factory settings.

## Layout

- `src/lib/tone.ts` – the three amps (CLN/RST/HOT) and their parameters
- `src/lib/modules.ts` – Gojira X sections (pitch / pre FX / EQ / post FX) and the optional Logic Channel EQ /
  Compressor / Noise Gate
- `src/lib/generate.ts` – turns parsed settings into output files
- `src/lib/preset.ts`, `src/lib/valueTree.ts` – Gojira X preset writer
- `src/lib/pst.ts` – Logic plug-in setting writer
- `src/lib/params.ts` – parameter type, ranges, value clamping
- `src/lib/prompt.ts` – the AI prompt for the selected amp and modules
- `src/lib/settings.ts` – parser for the pasted `name: value` lines
- `src/components/` – one card per step, plus shared UI primitives in `ui.tsx`
