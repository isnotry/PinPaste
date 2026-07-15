import { useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ClipboardItem } from "../types";

interface KeyboardNavParams {
  filtered: ClipboardItem[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  onEnter: (it: ClipboardItem) => void;
  onEscape: () => void;
}

/**
 * 列表键盘导航：方向键移动选中（基于业务 id，而非下标）、Enter 触发、Esc 关闭浮层。
 * 选中逻辑以 id 驱动，避免过滤/删除后下标漂移导致的错选（P1-4）。
 */
export function useKeyboardNav({
  filtered,
  selectedId,
  setSelectedId,
  onEnter,
  onEscape,
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
      } else if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
      }
    },
    [filtered, selectedId, setSelectedId, onEnter, onEscape],
  );
}
