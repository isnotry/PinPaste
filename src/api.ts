import { invoke } from "@tauri-apps/api/core";
import type { ClipboardItem, Group, Settings } from "./types";

export interface GetItemsOpts {
  limit?: number;
  search?: string;
  groupId?: number | null;
  favorite?: number | null;
}

/**
 * 统一错误封装：所有后端调用失败都转为 ApiError，携带中文上下文与原始 cause。
 * 调用方据此决定是 console.error 还是给用户可见反馈，杜绝静默吞错。
 */
export class ApiError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ApiError";
    this.cause = cause;
  }
}

async function call<T>(cmd: string, args?: Record<string, unknown>, msg?: string): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    throw new ApiError(msg ?? `调用 ${cmd} 失败`, e);
  }
}

export const getItems = (opts: GetItemsOpts = {}) =>
  call<ClipboardItem[]>("get_items", opts as Record<string, unknown>, "加载剪贴板失败");

export const getGroups = () => call<Group[]>("get_groups", undefined, "加载分组失败");

export const createGroup = (name: string, color?: string) =>
  call<Group>("create_group", { name, color }, "新建分组失败");

export const updateGroup = (id: number, patch: Partial<Pick<Group, "name" | "color">>) =>
  call("update_group", { id, ...patch }, "更新分组失败");

export const deleteGroup = (id: number) => call("delete_group", { id }, "删除分组失败");

export const getSettings = () => call<Settings>("get_settings", undefined, "加载设置失败");

// theme 应为 ThemeMode（来自 Settings 联合类型），不再用 string 绕过类型检查
export const saveSettings = (patch: Partial<Pick<Settings, "theme" | "auto_clean_days">>) =>
  call("save_settings", patch, "保存设置失败");

export const getImageData = (id: number) => call<string>("get_image_data", { id }, "读取图片失败");

export const deleteItem = (id: number) => call("delete_item", { id }, "删除条目失败");

export const updateItem = (
  id: number,
  patch: Partial<Pick<ClipboardItem, "name" | "favorite" | "group_id">>,
) => call("update_item", { id, ...patch }, "更新条目失败");

export const copyItem = (id: number) => call("copy_item", { id }, "复制失败");

export const pasteItem = (id: number) => call("paste_item", { id }, "粘贴失败");

export const hideMainWindow = () => call("hide_main_window", undefined, "隐藏窗口失败");
