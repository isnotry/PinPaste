import { renderHook } from "@testing-library/react";
import { useKeyboardNav } from "./useKeyboardNav";
import type { ClipboardItem } from "../types";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

const mkItem = (id: number): ClipboardItem => ({
  id,
  item_type: "text",
  content: `c${id}`,
  image_path: null,
  app_source: null,
  name: null,
  favorite: 0,
  group_id: null,
  created_at: 1700000000000,
});

const key = (k: string): ReactKeyboardEvent<HTMLDivElement> =>
  ({ key: k, preventDefault: () => {} }) as ReactKeyboardEvent<HTMLDivElement>;

const baseHook = (overrides: Partial<Parameters<typeof useKeyboardNav>[0]>) => ({
  filtered: [mkItem(1), mkItem(2), mkItem(3)],
  selectedId: 1,
  setSelectedId: vi.fn(),
  onEnter: vi.fn(),
  onEscape: vi.fn(),
  onBackspace: vi.fn(),
  ...overrides,
});

describe("useKeyboardNav", () => {
  const filtered = [mkItem(1), mkItem(2), mkItem(3)];

  it("ArrowDown：基于 id 向下选中且不越界", () => {
    const setSelectedId = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNav(baseHook({ filtered, selectedId: 1, setSelectedId })),
    );
    result.current(key("ArrowDown"));
    expect(setSelectedId).toHaveBeenCalledWith(2);
  });

  it("ArrowUp：基于 id 向上选中且不越界", () => {
    const setSelectedId = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNav(baseHook({ filtered, selectedId: 2, setSelectedId })),
    );
    result.current(key("ArrowUp"));
    expect(setSelectedId).toHaveBeenCalledWith(1);
  });

  it("selectedId 为 null 时 ArrowUp 不崩溃", () => {
    const { result } = renderHook(() => useKeyboardNav(baseHook({ filtered, selectedId: null })));
    expect(() => result.current(key("ArrowUp"))).not.toThrow();
  });

  it("Enter：在选中项上触发 onEnter", () => {
    const onEnter = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNav(baseHook({ filtered, selectedId: 2, onEnter })),
    );
    result.current(key("Enter"));
    expect(onEnter).toHaveBeenCalledWith(filtered[1]);
  });

  it("Backspace：在选中项上触发 onBackspace", () => {
    const onBackspace = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNav(baseHook({ filtered, selectedId: 2, onBackspace })),
    );
    result.current(key("Backspace"));
    expect(onBackspace).toHaveBeenCalledWith(filtered[1]);
  });

  it("Escape：触发 onEscape", () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNav(baseHook({ filtered, selectedId: 1, onEscape })),
    );
    result.current(key("Escape"));
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("其它按键：不触发任何回调", () => {
    const setSelectedId = vi.fn();
    const onEnter = vi.fn();
    const onEscape = vi.fn();
    const onBackspace = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNav(
        baseHook({ filtered, selectedId: 1, setSelectedId, onEnter, onEscape, onBackspace }),
      ),
    );
    result.current(key("a"));
    expect(setSelectedId).not.toHaveBeenCalled();
    expect(onEnter).not.toHaveBeenCalled();
    expect(onEscape).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });
});
