import { useCallback, useRef, useState } from "react";

export type LogKind = "hit" | "miss";

export interface LogEntry {
  id: number;
  text: string;
  kind?: LogKind;
}

export function useLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const log = useCallback((text: string, kind?: LogKind) => {
    const id = nextId.current++;
    setEntries((prev) => [...prev, { id, text, kind }]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, log, clear };
}
