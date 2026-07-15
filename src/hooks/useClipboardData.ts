import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  getItems,
  getGroups,
  updateItem,
  deleteItem,
  createGroup,
  deleteGroup,
  type GetItemsOpts,
} from "../api";
import { GROUP_COLORS } from "../config";
import type { ClipboardItem, Group } from "../types";

/**
 * 剪贴板数据层：管理 items / groups 的加载、实时监听与增删改。
 * 从 App 上帝组件中抽离，使其可独立测试、复用。错误由调用方（UI 层）决定如何呈现。
 */
export function useClipboardData(tab: "fav" | "all", groupFilter: number | null) {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const refresh = useCallback(async () => {
    try {
      const opts: GetItemsOpts = { limit: 500 };
      if (tab === "fav") opts.favorite = 1;
      if (groupFilter != null) opts.groupId = groupFilter;
      const [it, gr] = await Promise.all([getItems(opts), getGroups()]);
      setItems(it);
      setGroups(gr);
    } catch (e) {
      console.error("加载剪贴板数据失败", e);
    }
  }, [tab, groupFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 实时接收剪贴板监听推送
  useEffect(() => {
    const un = listen<ClipboardItem>("clipboard-new", (e) => {
      const it = e.payload;
      setItems((prev) => [it, ...prev.filter((i) => i.id !== it.id)]);
    });
    return () => {
      un.then((u) => u());
    };
  }, []);

  const toggleFav = useCallback(async (it: ClipboardItem) => {
    const next = it.favorite ? 0 : 1;
    await updateItem(it.id, { favorite: next });
    setItems((prev) => prev.map((i) => (i.id === it.id ? { ...i, favorite: next } : i)));
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const saveItem = useCallback(async (id: number, name: string | null, groupId: number | null) => {
    await updateItem(id, { name, group_id: groupId });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name, group_id: groupId } : i)));
  }, []);

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

  return { items, groups, refresh, toggleFav, remove, saveItem, addGroup, removeGroup };
}
