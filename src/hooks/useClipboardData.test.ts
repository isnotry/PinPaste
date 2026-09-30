import { renderHook, act, waitFor } from "@testing-library/react";
import { useClipboardData } from "./useClipboardData";
import type { ClipboardItem, Group } from "../types";

// ---- mock 数据访问层（真实实现会调用 Tauri 后端，测试环境必须替换） ----
const mockGetItems = vi.fn();
const mockGetGroups = vi.fn();
const mockGetAppSources = vi.fn();
const mockUpdateItem = vi.fn();
const mockDeleteItem = vi.fn();
const mockFavoriteItem = vi.fn();
const mockUnfavoriteItem = vi.fn();
const mockCreateGroup = vi.fn();
const mockDeleteGroup = vi.fn();
// 捕获实时监听回调，便于在测试中模拟 clipboard-new 推送
let clipboardListener: ((e: { payload: ClipboardItem }) => void) | null = null;
const mockListen = vi.fn((_event: string, cb: (e: { payload: ClipboardItem }) => void) => {
  clipboardListener = cb;
  return Promise.resolve(() => {});
});

vi.mock("../api", () => ({
  getItems: (...a: unknown[]) => mockGetItems(...a),
  getGroups: (...a: unknown[]) => mockGetGroups(...a),
  getAppSources: (...a: unknown[]) => mockGetAppSources(...a),
  updateItem: (...a: unknown[]) => mockUpdateItem(...a),
  deleteItem: (...a: unknown[]) => mockDeleteItem(...a),
  favoriteItem: (...a: unknown[]) => mockFavoriteItem(...a),
  unfavoriteItem: (...a: unknown[]) => mockUnfavoriteItem(...a),
  createGroup: (...a: unknown[]) => mockCreateGroup(...a),
  deleteGroup: (...a: unknown[]) => mockDeleteGroup(...a),
  // 测试按「运行在 Tauri 壳内」处理，否则实时监听分支会被跳过
  isTauriEnv: true,
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: (event: string, cb: (e: { payload: ClipboardItem }) => void) => mockListen(event, cb),
}));

const mkItem = (over: Partial<ClipboardItem> = {}): ClipboardItem => ({
  id: 1,
  item_type: "text",
  content: "hello",
  image_path: null,
  app_source: "Terminal",
  name: null,
  favorite: 0,
  group_id: null,
  created_at: 1700000000000,
  ...over,
});

const mkGroup = (over: Partial<Group> = {}): Group => ({
  id: 1,
  name: "默认",
  color: "#3b82f6",
  sort: 0,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  clipboardListener = null;
  mockGetItems.mockResolvedValue([mkItem(), mkItem({ id: 2, content: "world" })]);
  mockGetGroups.mockResolvedValue([mkGroup()]);
  mockGetAppSources.mockResolvedValue(["Terminal", "Visual Studio Code"]);
  mockUpdateItem.mockResolvedValue(undefined);
  mockDeleteItem.mockResolvedValue(undefined);
  mockFavoriteItem.mockResolvedValue(mkItem({ id: 99, favorite: 1 }));
  mockUnfavoriteItem.mockResolvedValue(undefined);
  mockCreateGroup.mockResolvedValue(undefined);
  mockDeleteGroup.mockResolvedValue(undefined);
});

describe("useClipboardData", () => {
  it("挂载时按 tab/group 条件拉取 items 与 groups", async () => {
    const { result } = renderHook(() => useClipboardData("fav", 3));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(mockGetItems).toHaveBeenCalledWith({ limit: 500, favorite: 1, groupId: 3 });
    expect(mockGetGroups).toHaveBeenCalledTimes(1);
    expect(result.current.groups).toHaveLength(1);
  });

  it("挂载时按 tab/group/app 条件拉取数据，appSources 不受 appFilter 影响", async () => {
    const { result } = renderHook(() => useClipboardData("fav", 3, "Terminal"));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(mockGetItems).toHaveBeenCalledWith({
      limit: 500,
      favorite: 1,
      groupId: 3,
      appSource: "Terminal",
    });
    // appSources 从 getAppSources() 获取，不受 appFilter 影响
    expect(result.current.appSources).toEqual(["Terminal", "Visual Studio Code"]);
  });

  it("appFilter 缺省为 null 时不传 appSource 条件", async () => {
    const { result } = renderHook(() => useClipboardData("all", null));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(mockGetItems).toHaveBeenCalledWith({ limit: 500, favorite: 0 });
  });

  it("toggleFav（收藏）：调用 favoriteItem 更新原记录 favorite=1", async () => {
    const updated = mkItem({ id: 1, favorite: 1 });
    mockFavoriteItem.mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useClipboardData("all", null));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.toggleFav(result.current.items[0]);
    });

    expect(mockFavoriteItem).toHaveBeenCalledWith(1);
    // 自动剪切 tab 下收藏后移除该条目（已变为收藏项）
    expect(result.current.items.find((i) => i.id === 1)).toBeUndefined();
  });

  it("toggleFav（取消收藏）：调用 unfavoriteItem 更新 favorite=0", async () => {
    const favItem = mkItem({ id: 3, favorite: 1 });
    mockGetItems.mockResolvedValueOnce([favItem]);
    const { result } = renderHook(() => useClipboardData("fav", null));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.toggleFav(favItem);
    });

    expect(mockUnfavoriteItem).toHaveBeenCalledWith(3);
    // fav tab 下取消收藏后移除该条目
    expect(result.current.items).toHaveLength(0);
  });

  it("remove：调用 deleteItem 并从列表移除", async () => {
    const { result } = renderHook(() => useClipboardData("all", null));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.remove(2);
    });

    expect(mockDeleteItem).toHaveBeenCalledWith(2);
    expect(result.current.items.find((i) => i.id === 2)).toBeUndefined();
  });

  it("saveItem：更新 name/group_id 后调用 refresh 同步状态", async () => {
    const updatedItem = mkItem({ id: 1, name: "重命名", group_id: 5 });
    // saveItem 内部会调用 refresh → getItems + getGroups + getAppSources，mock 需返回更新后的数据
    mockGetItems
      .mockResolvedValueOnce([mkItem(), mkItem({ id: 2, content: "world" })]) // 初始加载
      .mockResolvedValueOnce([updatedItem, mkItem({ id: 2, content: "world" })]); // refresh 带筛选

    const { result } = renderHook(() => useClipboardData("all", null));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.saveItem(1, "重命名", 5);
    });

    expect(mockUpdateItem).toHaveBeenCalledWith(1, { name: "重命名", group_id: 5 });
    // saveItem 内部 refresh 后，items 应与 DB 一致
    expect(result.current.items[0]).toMatchObject({ name: "重命名", group_id: 5 });
  });

  it("addGroup：用轮询配色创建后刷新 groups", async () => {
    mockGetGroups.mockResolvedValueOnce([mkGroup()]); // addGroup 内部的二次 getGroups
    const { result } = renderHook(() => useClipboardData("all", null));
    await waitFor(() => expect(result.current.groups).toHaveLength(1));

    await act(async () => {
      await result.current.addGroup();
    });

    // 已有 1 个分组（beforeEach 返回 1 条），轮询取第 2 个颜色 GROUP_COLORS[1]
    expect(mockCreateGroup).toHaveBeenCalledWith("新分组", "#ef4444");
  });

  it("removeGroup：调用 deleteGroup 并从列表移除", async () => {
    const { result } = renderHook(() => useClipboardData("all", null));
    await waitFor(() => expect(result.current.groups).toHaveLength(1));

    await act(async () => {
      await result.current.removeGroup(1);
    });

    expect(mockDeleteGroup).toHaveBeenCalledWith(1);
    expect(result.current.groups.find((g) => g.id === 1)).toBeUndefined();
  });

  it("实时 clipboard-new 推送：去重并插到列表头部", async () => {
    const { result } = renderHook(() => useClipboardData("all", null));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(clipboardListener).not.toBeNull();

    const incoming = mkItem({ id: 2, content: "dup" }); // 与现有 id=2 重复
    act(() => {
      clipboardListener!({ payload: incoming });
    });

    await waitFor(() => expect(result.current.items[0].id).toBe(2));
    // 去重：仍然是 2 条，仅顺序/内容更新
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].content).toBe("dup");
  });

  it("加载失败不抛出：console.error 记录，状态保持空", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetItems.mockRejectedValueOnce(new Error("backend down"));
    const { result } = renderHook(() => useClipboardData("all", null));
    await waitFor(() => expect(mockGetItems).toHaveBeenCalled());
    expect(spy).toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    spy.mockRestore();
  });
});
