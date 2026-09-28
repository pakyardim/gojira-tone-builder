export type VarValue =
  | { kind: "string"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "raw"; bytes: Uint8Array };

export interface ValueTreeNode {
  type: string;
  props: [name: string, value: VarValue][];
  children: ValueTreeNode[];
}

const MARKER_BOOL_TRUE = 2;
const MARKER_BOOL_FALSE = 3;
const MARKER_STRING = 5;

export function readValueTree(bytes: Uint8Array): ValueTreeNode {
  const decoder = new TextDecoder();
  let pos = 0;

  const byte = () => {
    if (pos >= bytes.length) throw new Error("Preset verisi beklenmedik şekilde bitti");
    return bytes[pos++];
  };
  const cint = () => {
    const head = byte();
    let value = 0;
    for (let i = 0; i < (head & 0x7f); i++) value += byte() * 2 ** (8 * i);
    return head & 0x80 ? -value : value;
  };
  const cstring = () => {
    const start = pos;
    while (byte() !== 0);
    return decoder.decode(bytes.subarray(start, pos - 1));
  };
  const variant = (): VarValue => {
    const size = cint();
    const start = pos;
    pos += size;
    if (size < 1 || pos > bytes.length) throw new Error("Preset verisinde geçersiz değer");
    const marker = bytes[start];
    if (marker === MARKER_STRING) {
      return {
        kind: "string",
        value: decoder.decode(bytes.subarray(start + 1, pos - 1)),
      };
    }
    if (marker === MARKER_BOOL_TRUE || marker === MARKER_BOOL_FALSE) {
      return { kind: "bool", value: marker === MARKER_BOOL_TRUE };
    }
    return { kind: "raw", bytes: bytes.slice(start, pos) };
  };
  const node = (): ValueTreeNode => {
    const type = cstring();
    const props: ValueTreeNode["props"] = [];
    for (let n = cint(); n > 0; n--) props.push([cstring(), variant()]);
    const children: ValueTreeNode[] = [];
    for (let n = cint(); n > 0; n--) children.push(node());
    return { type, props, children };
  };

  const root = node();
  if (pos !== bytes.length) throw new Error("Preset verisinin sonunda fazladan bayt var");
  return root;
}

export function writeValueTree(root: ValueTreeNode): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const out: number[] = [];

  const cint = (value: number) => {
    const le: number[] = [];
    for (let rest = Math.abs(value); rest > 0; rest = Math.floor(rest / 256)) le.push(rest % 256);
    out.push(le.length | (value < 0 ? 0x80 : 0), ...le);
  };
  const cstring = (s: string) => out.push(...encoder.encode(s), 0);
  const variant = (v: VarValue) => {
    if (v.kind === "string") {
      const utf8 = encoder.encode(v.value);
      cint(utf8.length + 2);
      out.push(MARKER_STRING, ...utf8, 0);
    } else if (v.kind === "bool") {
      cint(1);
      out.push(v.value ? MARKER_BOOL_TRUE : MARKER_BOOL_FALSE);
    } else {
      cint(v.bytes.length);
      out.push(...v.bytes);
    }
  };
  const node = (n: ValueTreeNode) => {
    cstring(n.type);
    cint(n.props.length);
    for (const [name, value] of n.props) {
      cstring(name);
      variant(value);
    }
    cint(n.children.length);
    n.children.forEach(node);
  };

  node(root);
  return Uint8Array.from(out);
}

export function setStringProperty(root: ValueTreeNode, name: string, value: string): number {
  let count = 0;
  const visit = (n: ValueTreeNode) => {
    for (const prop of n.props) {
      if (prop[0] === name) {
        prop[1] = { kind: "string", value };
        count++;
      }
    }
    n.children.forEach(visit);
  };
  visit(root);
  return count;
}
