import type { Lang } from "./types";

export type { Lang };

export interface LangOption {
  value: Lang;
  label: string;
}

export const LANG_OPTIONS: LangOption[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

type Dict = Record<string, [string, string]>; // [zh, en]

const dict: Dict = {
  // Tabs
  tab_fav: ["收藏", "Favorites"],
  tab_all: ["自动剪切", "Clipboard"],

  // Sidebar
  sidebar_all: ["全部", "All"],
  sidebar_current: ["当前", "Current"],
  sidebar_ungrouped: ["未分组", "Ungrouped"],

  // Search
  search_fav: ["搜索收藏…", "Search favorites…"],
  search_all: ["搜索剪贴板…", "Search clipboard…"],

  // Items
  item_image: ["[图片]", "[Image]"],
  item_content: ["[内容]", "[Content]"],
  item_unknown_source: ["未知", "Unknown"],
  item_ungrouped: ["未分组", "Ungrouped"],

  // Actions
  action_edit: ["编辑", "Edit"],
  action_delete: ["删除", "Delete"],
  action_copy: ["复制", "Copy"],
  action_paste: ["粘贴", "Paste"],
  action_fav: ["收藏", "Favorite"],
  action_unfav: ["取消收藏", "Unfavorite"],
  action_pin: ["钉在最前", "Pin on Top"],
  action_unpin: ["取消钉住", "Unpin"],
  action_settings: ["设置", "Settings"],
  action_close: ["关闭", "Close"],

  // Toast
  toast_copied: ["已复制", "Copied"],

  // Edit dialog
  edit_title: ["编辑", "Edit"],
  edit_hint: ["双击列表条目可打开编辑", "Double-click an item to edit"],
  edit_name: ["名称", "Name"],
  edit_content: ["内容", "Content"],
  edit_group: ["分组", "Group"],
  edit_no_group: ["无分组", "No Group"],
  edit_save: ["保存", "Save"],
  edit_cancel: ["取消", "Cancel"],
  edit_delete_confirm: ["确认删除？", "Confirm delete?"],

  // Settings
  settings_title: ["设置", "Settings"],
  settings_theme: ["主题", "Theme"],
  settings_theme_system: ["跟随系统", "System"],
  settings_theme_light: ["浅色", "Light"],
  settings_theme_dark: ["深色", "Dark"],
  settings_clean: ["自动清理", "Auto Clean"],
  settings_clean_off: ["关闭", "Off"],
  settings_clean_days: ["天", "days"],
  settings_language: ["语言", "Language"],

  // Empty
  empty_fav: ["还没有收藏的内容", "No favorites yet"],
  empty_all: ["暂无剪贴板记录", "No clipboard history"],

  // Time
  time_just_now: ["刚刚", "just now"],
  time_min_ago: ["分钟前", "min ago"],
  time_hour_ago: ["小时前", "h ago"],
  time_yesterday: ["昨天", "yesterday"],
};

export function createT(lang: Lang) {
  return (key: string): string => {
    const entry = dict[key];
    if (!entry) return key;
    return lang === "zh" ? entry[0] : entry[1];
  };
}

export type TFunc = ReturnType<typeof createT>;
