import { useCallback, useRef, useState } from 'react';
import type { OfficeRoom } from '../domain/types';
export function useEditorHistory() {
  const [history, setHistory] = useState<{
    past: OfficeRoom[];
    present: OfficeRoom | null;
    future: OfficeRoom[];
  }>({ past: [], present: null, future: [] });
  const baseline = useRef('');
  const reset = useCallback((room: OfficeRoom) => {
    baseline.current = JSON.stringify(room);
    setHistory({ past: [], present: structuredClone(room), future: [] });
  }, []);
  const apply = useCallback(
    (change: (room: OfficeRoom) => OfficeRoom) =>
      setHistory((h) => {
        if (!h.present) return h;
        const next = change(structuredClone(h.present));
        if (JSON.stringify(next) === JSON.stringify(h.present)) return h;
        return { past: [...h.past, h.present].slice(-80), present: next, future: [] };
      }),
    [],
  );
  const undo = useCallback(
    () =>
      setHistory((h) =>
        h.past.length && h.present
          ? {
              past: h.past.slice(0, -1),
              present: h.past[h.past.length - 1],
              future: [h.present, ...h.future],
            }
          : h,
      ),
    [],
  );
  const redo = useCallback(
    () =>
      setHistory((h) =>
        h.future.length && h.present
          ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
          : h,
      ),
    [],
  );
  return {
    draft: history.present,
    dirty: !!history.present && JSON.stringify(history.present) !== baseline.current,
    canUndo: !!history.past.length,
    canRedo: !!history.future.length,
    reset,
    apply,
    undo,
    redo,
  };
}
