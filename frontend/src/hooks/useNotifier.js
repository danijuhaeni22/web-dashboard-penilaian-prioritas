import { useEffect, useState } from "react";

/**
 * useNotifier
 * - notify('pesan') -> variant 'default'
 * - notify({ text: 'pesan', variant: 'error' | 'success' | 'info' | 'default' })
 */
export function useNotifier(timeout = 2200) {
  const [note, setNote] = useState(null); // { text, variant }

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), timeout);
    return () => clearTimeout(t);
  }, [note, timeout]);

  const notify = (input) => {
    if (!input) return;
    if (typeof input === "string") {
      setNote({ text: input, variant: "default" });
    } else if (typeof input === "object") {
      const { text = "", variant = "default" } = input || {};
      setNote({ text, variant });
    }
  };

  return [note, notify];
}
