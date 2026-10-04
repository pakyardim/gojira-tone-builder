import { decodeDataUrl } from "./binary.ts";
import channelStripTemplateUrl from "../assets/logic-channel-strip-template.cst?inline";
import { patchPst } from "./pst.ts";

/**
 * Logic channel strip setting (.cst) saved from a Noise Gate → Archetype Gojira X → Channel EQ →
 * Compressor strip. Everything is patched in place without changing the file's length, because the
 * format has nested size fields that would otherwise need rewriting:
 *  - the three Logic plug-ins are stored as complete `.pst` files (found by their GAMETSPP tag),
 *  - Archetype's state is an XML (`VC2!` + length) base64-encoded inside an embedded plist.
 */
const template = decodeDataUrl(channelStripTemplateUrl);

const ARCHETYPE_TAG = "VC2!";
const PST_TAG = "GAMETSPP";
const PST_TAG_OFFSET = 12;

export interface PstEdit {
  /** The plug-in's default `.pst`: its values replace the template's before `values` are applied. */
  defaults: Uint8Array;
  values: [index: number, value: number][];
}

export interface ChannelStripEdits {
  /** Noise Gate, Channel EQ and Compressor, in the order they appear in the strip. */
  pst: [gate: PstEdit, eq: PstEdit, comp: PstEdit];
  /** Archetype Gojira X state attributes, e.g. ["rhythmAmpGain", "0.72"]. */
  archetype: (precision: number) => [name: string, value: string][];
}

const latin1 = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

function pstChunkOffsets(bytes: Uint8Array): number[] {
  const text = latin1(bytes);
  const offsets: number[] = [];
  for (let i = text.indexOf(PST_TAG); i >= 0; i = text.indexOf(PST_TAG, i + 1)) offsets.push(i - PST_TAG_OFFSET);
  return offsets;
}

function patchChunk(bytes: Uint8Array, start: number, { defaults, values }: PstEdit) {
  const view = new DataView(bytes.buffer, bytes.byteOffset + start);
  const size = view.getUint32(0, true);
  const chunk = bytes.subarray(start, start + size);
  const base = Uint8Array.from(chunk);
  const shared = Math.min(base.length, defaults.length);
  // Parameters start at byte 28; only copy the defaults' parameter floats, not the trailer.
  const defaultCount = new DataView(defaults.buffer, defaults.byteOffset).getUint32(8, true) - 1;
  const chunkCount = view.getUint32(8, true) - 1;
  const count = Math.min(defaultCount, chunkCount);
  base.set(defaults.subarray(28, Math.min(28 + 4 * count, shared)), 28);
  chunk.set(patchPst(base, values));
}

function archetypeXml(attributes: [string, string][], length: number, withProlog: boolean, source: string): string {
  let xml = source;
  for (const [name, value] of attributes) {
    const pattern = new RegExp(`(\\s${name}=")[^"]*(")`, "g");
    if (!pattern.test(xml)) throw new Error(`Kanal şeridi şablonunda "${name}" bulunamadı`);
    xml = xml.replace(pattern, (_, a: string, b: string) => `${a}${value}${b}`);
  }
  if (!withProlog) xml = xml.replace(/^<\?xml[^>]*\?>\s*/, "");
  if (xml.length > length) return xml;
  const root = xml.indexOf("<appModel");
  return `${xml.slice(0, root)}${" ".repeat(length - xml.length)}${xml.slice(root)}`;
}

const STATE_KEY = "<key>jucePluginState</key>";

/** Logic keeps one Archetype state per channel (the plug-in window's L / R buttons); all get the same patch. */
function patchArchetype(bytes: Uint8Array<ArrayBuffer>, edits: ChannelStripEdits["archetype"]) {
  const text = latin1(bytes);
  let found = 0;
  for (let keyAt = text.indexOf(STATE_KEY); keyAt >= 0; keyAt = text.indexOf(STATE_KEY, keyAt + 1)) {
    patchArchetypeState(bytes, text, keyAt, edits);
    found++;
  }
  if (found === 0) throw new Error("Kanal şeridi şablonunda Archetype durumu bulunamadı");
}

function patchArchetypeState(
  bytes: Uint8Array<ArrayBuffer>,
  text: string,
  keyAt: number,
  edits: ChannelStripEdits["archetype"],
) {
  const open = text.indexOf("<data>", keyAt) + "<data>".length;
  const close = text.indexOf("</data>", open);

  const original = text.slice(open, close);
  const state = Uint8Array.from(atob(original.replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  if (latin1(state.subarray(0, 4)) !== ARCHETYPE_TAG) throw new Error("Archetype durumu beklenen biçimde değil");
  const length = new DataView(state.buffer).getUint32(4, true);
  const source = latin1(state.subarray(8, 8 + length));

  let xml: string | undefined;
  for (const precision of [6, 4, 3]) {
    for (const withProlog of [true, false]) {
      const candidate = archetypeXml(edits(precision), length, withProlog, source);
      if (candidate.length <= length) {
        xml = candidate;
        break;
      }
    }
    if (xml) break;
  }
  if (!xml) throw new Error("Archetype ayarları kanal şeridi şablonuna sığmadı");

  const next = Uint8Array.from(state);
  next.set(Uint8Array.from(xml, (c) => c.charCodeAt(0)), 8);
  next.fill(0x20, 8 + xml.length, 8 + length);

  // Same length, same line wrapping: swap only the base64 characters.
  const encoded = btoa(latin1(next));
  let k = 0;
  const replaced = original.replace(/\S/g, () => encoded[k++]);
  if (k !== encoded.length) throw new Error("Archetype durumu şablonun boyutunu değiştirdi");
  Uint8Array.from(replaced, (c) => c.charCodeAt(0)).forEach((b, i) => (bytes[open + i] = b));
}

export function buildChannelStrip(edits: ChannelStripEdits): Uint8Array<ArrayBuffer> {
  const bytes = Uint8Array.from(template);
  const offsets = pstChunkOffsets(bytes);
  if (offsets.length !== 3) throw new Error("Kanal şeridi şablonunda 3 Logic eklentisi bekleniyordu");
  offsets.forEach((start, i) => patchChunk(bytes, start, edits.pst[i]));
  patchArchetype(bytes, edits.archetype);
  return bytes;
}
