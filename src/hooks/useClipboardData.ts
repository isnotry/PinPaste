import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  getItems,
  getGroups,
  getAppSources,
  updateItem,
  deleteItem,
  favoriteItem,
  unfavoriteItem,
  createGroup,
  deleteGroup,
  isTauriEnv,
  type GetItemsOpts,
} from "../api";
import { GROUP_COLORS } from "../config";
import type { ClipboardItem, Group } from "../types";

/**
 * 剪贴板数据层：管理 items / groups 的加载、实时监听与增删改。
 * 从 App 上帝组件中抽离，使其可独立测试、复用。错误由调用方（UI 层）决定如何呈现。
 */
export function useClipboardData(
  tab: "fav" | "all",
  groupFilter: number | null,
  appFilter: string | null = null,
) {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allAppSources, setAllAppSources] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const opts: GetItemsOpts = { limit: 500 };
      if (tab === "fav") opts.favorite = 1;
      else opts.favorite = 0;
      if (groupFilter != null) opts.groupId = groupFilter;
      if (appFilter != null) opts.appSource = appFilter;
      const [it, gr, sources] = await Promise.all([getItems(opts), getGroups(), getAppSources()]);
      setItems(it);
      setGroups(gr);
      setAllAppSources(sources);
    } catch (e) {
      console.error("加载剪贴板数据失败", e);
    }
  }, [tab, groupFilter, appFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 实时接收剪贴板监听推送（去重：同 id 移到最前）
  useEffect(() => {
    if (!isTauriEnv) return;
    const un = listen<ClipboardItem>("clipboard-new", (e) => {
      const it = e.payload;
      setItems((prev) => {
        // 收藏 tab 只收 favorite 项
        if (tab === "fav" && !it.favorite) {
          return prev.filter((i) => i.id !== it.id);
        }
        // appFilter 不匹配则移除
        if (appFilter && it.app_source !== appFilter) {
          return prev.filter((i) => i.id !== it.id);
        }
        // groupFilter 不匹配则移除
        if (groupFilter != null && it.group_id !== groupFilter) {
          return prev.filter((i) => i.id !== it.id);
        }
        return [it, ...prev.filter((i) => i.id !== it.id)];
      });
    });
    return () => {
      un.then((u) => u());
    };
  }, [tab, appFilter, groupFilter]);

  const toggleFav = useCallback(
    async (it: ClipboardItem) => {
      if (it.favorite) {
        // 取消收藏：UPDATE favorite=0，不删除记录
        await unfavoriteItem(it.id);
        setItems((prev) => prev.map((i) => (i.id === it.id ? { ...i, favorite: 0 } : i)));
        // 收藏 tab 下取消收藏后移除该条目
        if (tab === "fav") {
          setItems((prev) => prev.filter((i) => i.id !== it.id));
        }
      } else {
        // 收藏：UPDATE favorite=1
        const updated = await favoriteItem(it.id);
        setItems((prev) => prev.map((i) => (i.id === it.id ? updated : i)));
        // 自动剪切 tab 下收藏后移除该条目（已变为收藏项）
        if (tab === "all") {
          setItems((prev) => prev.filter((i) => i.id !== it.id));
        }
      }
    },
    [tab],
  );

  const remove = useCallback(async (id: number) => {
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const saveItem = useCallback(
    async (id: number, name: string | null, groupId: number | null, content?: string | null) => {
      const patch: Parameters<typeof updateItem>[1] = { name, group_id: groupId };
      if (content != null) patch.content = content;
      await updateItem(id, patch);
      // DB 更新后主动 refresh，确保本地 state 与 DB 完全一致，
      // 避免依赖后续 tab 切换的被动 refresh 导致分组设置丢失。
      await refresh();
    },
    [refresh],
  );

  const addGroup = useCallback(async () => {
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
    await createGroup("新分组", color);
    const gr = await getGroups();
    setGroups(gr);
  }, [groups.length]);

  const removeGroup = useCallback(async (id: number) => {
    await deleteGroup(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // 从全部条目中提取去重的 app_source，不受当前筛选影响
  const appSources = allAppSources;

  return { items, groups, appSources, refresh, toggleFav, remove, saveItem, addGroup, removeGroup };
}
