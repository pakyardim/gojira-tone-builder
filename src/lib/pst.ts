const FIRST_PARAM_OFFSET = 28;

export function patchPst(
  template: Uint8Array,
  values: Iterable<[index: number, value: number]>,
): Uint8Array<ArrayBuffer> {
  const bytes = Uint8Array.from(template);
  const view = new DataView(bytes.buffer);
  const littleEndian = String.fromCharCode(...bytes.subarray(12, 16)) === "GAME";
  const paramCount = view.getUint32(8, littleEndian) - 1;

  for (const [index, value] of values) {
    if (index < 0 || index >= paramCount) throw new Error(`Ayar dosyasında ${index}. parametre yok`);
    view.setFloat32(FIRST_PARAM_OFFSET + 4 * index, value, littleEndian);
  }
  return bytes;
}
