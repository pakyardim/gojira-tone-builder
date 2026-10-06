import { OPTIONAL_MODULES, type OptionalModuleId } from "../lib/modules.ts";
import { Card, Note } from "./ui.tsx";

interface Props {
  enabled: ReadonlySet<OptionalModuleId>;
  onToggle: (id: OptionalModuleId) => void;
}

export function AmpCard({ enabled, onToggle }: Props) {
  return (
    <Card title="3 · Eklentiler">
      <Note className="mb-4">
        Amfiyi (RST / HOT / CLN) AI tona göre kendisi seçer; 5. adımda yapıştırdığın cevaptaki <b>amp</b> satırından
        okunur (2. adımda bölüm seçtiysen amfi bölüm başına senin seçtiğin olur). Gojira X preset'i her şeyi tek dosyada içerir — amfi, gate, pitch (WOW, OCT), pre FX (OD, DRT, PHSR,
        CHR), EQ ve post FX (DLY, REV) — ve IMPORT ile hepsi birlikte yüklenir.
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
