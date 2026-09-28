export function decodeDataUrl(url: string): Uint8Array<ArrayBuffer> {
  const binary = atob(url.slice(url.indexOf(",") + 1));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
