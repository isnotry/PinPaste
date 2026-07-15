import { invoke } from "@tauri-apps/api/core";
import type { ClipboardItem, Group, Settings } from "./types";

export interface GetItemsOpts {
  limit?: number;
  search?: string;
  groupId?: number | null;
  favorite?: number | null;
}

export const getItems = (opts: GetItemsOpts = {}) =>
  invoke<ClipboardItem[]>("get_items", opts as Record<string, unknown>);

export const getGroups = () => invoke<Group[]>("get_groups");

export const createGroup = (name: string, color?: string) =>
  invoke<Group>("create_group", { name, color });

export const updateGroup = (id: number, patch: Partial<{ name: string; color: string }>) =>
  invoke("update_group", { id, ...patch });

export const deleteGroup = (id: number) => invoke("delete_group", { id });

export const getSettings = () => invoke<Settings>("get_settings");

export const saveSettings = (patch: Partial<{ theme: string; auto_clean_days: number }>) =>
  invoke("save_settings", patch);

export const getImageData = (id: number) => invoke<string>("get_image_data", { id });

export const deleteItem = (id: number) => invoke("delete_item", { id });

export const updateItem = (
  id: number,
  patch: { name?: string | null; favorite?: number; groupId?: number | null },
) => invoke("update_item", { id, ...patch });

export const copyItem = (id: number) => invoke("copy_item", { id });

export const pasteItem = (id: number) => invoke("paste_item", { id });

export const hideMainWindow = () => invoke("hide_main_window");
