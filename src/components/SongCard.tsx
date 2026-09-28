import type { Song } from "../lib/song.ts";
import { Card, fieldClass, Note } from "./ui.tsx";

interface Props {
  song: Song;
  onChange: (song: Song) => void;
}

const labelClass = "mb-1 block text-[0.78rem] font-semibold text-fg-dim";

export function SongCard({ song, onChange }: Props) {
  return (
    <Card title="1 · Şarkı">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Şarkı adı</span>
          <input
            className={`${fieldClass} w-full`}
            value={song.title}
            onChange={(e) => onChange({ ...song, title: e.target.value })}
            placeholder="ör. Stranded"
          />
        </label>
        <label>
          <span className={labelClass}>Sanatçı</span>
          <input
            className={`${fieldClass} w-full`}
            value={song.artist}
            onChange={(e) => onChange({ ...song, artist: e.target.value })}
            placeholder="ör. Gojira"
          />
        </label>
      </div>
      <Note className="mt-2.5">Prompt'a yazılır; preset adı da otomatik bundan oluşur.</Note>
    </Card>
  );
}
