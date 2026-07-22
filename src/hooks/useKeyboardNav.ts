import { useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ClipboardItem } from "../types";

interface KeyboardNavParams {
  filtered: ClipboardItem[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  onEnter: (it: ClipboardItem) => void;
  onEscape: () => void;
  onBackspace: (it: ClipboardItem) => void;
}

/**
 * 列表键盘导航：方向键移动选中、Enter 粘贴、Backspace 删除、Esc 关闭浮层。
 */
export function useKeyboardNav({
  filtered,
  selectedId,
  setSelectedId,
  onEnter,
  onEscape,
  onBackspace,
}: KeyboardNavParams) {
  return useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = filtered.findIndex((i) => i.id === selectedId);
        const next = filtered[Math.min(idx + 1, filtered.length - 1)];
        if (next) setSelectedId(next.id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = filtered.findIndex((i) => i.id === selectedId);
        const prev = filtered[Math.max(idx - 1, 0)];
        if (prev) setSelectedId(prev.id);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const it = filtered.find((i) => i.id === selectedId);
        if (it) onEnter(it);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        const it = filtered.find((i) => i.id === selectedId);
        if (it) onBackspace(it);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
      }
    },
    [filtered, selectedId, setSelectedId, onEnter, onEscape, onBackspace],
  );
}
