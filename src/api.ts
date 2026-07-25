import { invoke } from "@tauri-apps/api/core";
import type { ClipboardItem, Group, Settings } from "./types";

export interface GetItemsOpts {
  limit?: number;
  search?: string;
  groupId?: number | null;
  favorite?: number | null;
  appSource?: string | null;
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

/** 获取所有出现过的来源 App 列表（去重），用于前端 App 筛选 chips */
export const getAppSources = () => call<string[]>("get_app_sources", undefined, "加载来源失败");

/** 获取当前前台（活跃）App 名称，用于「当前使用 App」一键绑定 */
export const getActiveApp = () =>
  call<string | null>("get_active_app", undefined, "获取当前 App 失败");

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

export const favoriteItem = (id: number) =>
  call<ClipboardItem>("favorite_item", { id }, "收藏失败");

export const unfavoriteItem = (id: number) => call("unfavorite_item", { id }, "取消收藏失败");

export const updateItem = (
  id: number,
  patch: Partial<Pick<ClipboardItem, "name" | "content" | "favorite" | "group_id">>,
) => {
  // Tauri v2 对 #[tauri::command] 参数做 camelCase 转换，Rust 侧 group_id 对应 JSON 键名 groupId。
  // 但 patch 类型来自 ClipboardItem（snake_case），需将 group_id 重命名为 groupId 才能被后端正确接收。
  const { group_id: groupId, ...rest } = patch;
  return call(
    "update_item",
    { id, ...rest, ...(groupId !== undefined ? { groupId } : {}) },
    "更新条目失败",
  );
};

export const copyItem = (id: number) => call("copy_item", { id }, "复制失败");

export const pasteItem = (id: number) => call("paste_item", { id }, "粘贴失败");

export const hideMainWindow = () => call("hide_main_window", undefined, "隐藏窗口失败");

export const togglePin = () => call<boolean>("toggle_pin", undefined, "切换置顶失败");

/** 批量获取多个 App 的图标（PNG base64），返回 {appName: base64} map */
export const getAppIcons = (appNames: string[]) =>
  call<Record<string, string | null>>("get_app_icons", { appNames }, "获取 App 图标失败");
