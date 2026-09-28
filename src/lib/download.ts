import { zipSync } from "fflate";

export interface DownloadableFile {
  fileName: string;
  bytes: Uint8Array<ArrayBuffer>;
}

export function downloadFile({ fileName, bytes }: DownloadableFile) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function packageFiles(files: DownloadableFile[], baseName: string): DownloadableFile {
  if (files.length === 1) return files[0];
  const zipped = zipSync(Object.fromEntries(files.map((f) => [f.fileName, f.bytes])));
  return { fileName: `${baseName}.zip`, bytes: new Uint8Array(zipped) };
}
