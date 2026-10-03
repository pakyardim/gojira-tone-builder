import { OPTIONAL_MODULES, type OptionalModuleId } from "../lib/modules.ts";
import { AMPS, type AmpId } from "../lib/tone.ts";
import { Card, Note } from "./ui.tsx";

interface Props {
  amp: AmpId;
  onAmpChange: (amp: AmpId) => void;
  enabled: ReadonlySet<OptionalModuleId>;
  onToggle: (id: OptionalModuleId) => void;
}

export function AmpCard({ amp, onAmpChange, enabled, onToggle }: Props) {
  const current = AMPS.find((a) => a.id === amp)!;

  return (
    <Card title="2 · Amfi ve Eklentiler">
      <div role="group" aria-label="Amfi" className="inline-flex rounded-[9px] border border-border bg-surface-2 p-0.5">
        {AMPS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={a.id === amp}
            onClick={() => onAmpChange(a.id)}
            className={`cursor-pointer rounded-[7px] px-4 py-1.75 text-[0.92rem] font-semibold transition-colors ${
              a.id === amp ? "bg-accent text-white" : "text-fg-dim hover:text-fg"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <Note className="mt-2.5">
        <b className="text-fg">
          {current.label} ({current.name}):
        </b>{" "}
        {current.hint} Preset'i açınca Gojira X'te bu amfi seçili gelir. Gojira X preset'i her şeyi tek dosyada içerir —
        amfi, gate, pitch (WOW, OCT), pre FX (OD, DRT, PHSR, CHR), EQ ve post FX (DLY, REV) — ve IMPORT ile hepsi
        birlikte yüklenir.
      </Note>

      <fieldset className="mt-4">
        <legend className="mb-2 text-[0.85rem] font-semibold text-fg">
          Logic eklentileri de ayarlansın mı? (her biri ayrı .pst dosyası)
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {OPTIONAL_MODULES.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer gap-2.5 rounded-[9px] border px-3 py-2.5 transition-colors ${
                enabled.has(m.id) ? "border-accent bg-accent-dim/40" : "border-border bg-surface-2 hover:border-fg-dim"
              }`}
            >
              <input
                type="checkbox"
                checked={enabled.has(m.id)}
                onChange={() => onToggle(m.id)}
                className="mt-0.5 size-4 shrink-0 accent-accent"
              />
              <span>
                <span className="block text-[0.88rem] font-semibold text-fg">{m.title}</span>
                <span className="block text-[0.78rem] leading-[1.45] text-fg-dim">{m.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}
