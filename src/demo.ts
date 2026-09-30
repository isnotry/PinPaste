import type { ClipboardItem, Group, Settings } from "./types";

/**
 * 浏览器预览数据：在 `npm run dev`（非 Tauri 环境）下替代后端返回值，
 * 让界面无需启动 Rust 后端就能看到有内容的样子 —— 用于截图与快速预览 UI。
 * 内容保持中英通用，两版界面共用同一批演示数据。
 */

const MINUTE = 60_000;
const NOW = Date.now();

export const DEMO_GROUPS: Group[] = [
  { id: 1, name: "Work", color: "#3b82f6", sort: 0 },
  { id: 2, name: "Ideas", color: "#a855f7", sort: 1 },
];

export const DEMO_APP_SOURCES = ["Safari", "VS Code", "Terminal", "Notes"];

export const DEMO_SETTINGS: Settings = {
  theme: "system",
  auto_clean_days: 30,
  pinned: false,
  lang: "zh",
};

/** 1×1 占位图换成一张带底色的 SVG，避免预览时空洞 */
export const DEMO_IMAGE_DATA =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64"><rect width="96" height="64" fill="#e2e8f0"/><circle cx="30" cy="24" r="10" fill="#f59e0b"/><path d="M8 58 L36 34 L54 50 L70 40 L90 58 Z" fill="#3b82f6"/></svg>`,
  );

export const DEMO_ITEMS: ClipboardItem[] = [
  {
    id: 1,
    item_type: "text",
    content: "PinPaste — a lightweight clipboard manager for macOS.",
    image_path: null,
    app_source: "Safari",
    name: null,
    favorite: 1,
    group_id: 1,
    created_at: NOW - 2 * MINUTE,
  },
  {
    id: 2,
    item_type: "text",
    content: "npm run tauri dev",
    image_path: null,
    app_source: "Terminal",
    name: null,
    favorite: 1,
    group_id: 2,
    created_at: NOW - 24 * MINUTE,
  },
  {
    id: 3,
    item_type: "text",
    content: "SELECT id, content FROM items WHERE favorite = 1 ORDER BY created_at DESC;",
    image_path: null,
    app_source: "VS Code",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 5 * MINUTE,
  },
  {
    id: 4,
    item_type: "image",
    content: null,
    image_path: "demo/screenshot.png",
    app_source: "Safari",
    name: "screenshot.png",
    favorite: 0,
    group_id: null,
    created_at: NOW - 11 * MINUTE,
  },
  {
    id: 5,
    item_type: "text",
    content: 'git commit -m "docs: rewrite README for open source"',
    image_path: null,
    app_source: "Terminal",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 38 * MINUTE,
  },
  {
    id: 6,
    item_type: "text",
    content: "Meeting notes: ship the clipboard history panel before Friday.",
    image_path: null,
    app_source: "Notes",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 96 * MINUTE,
  },
  {
    id: 7,
    item_type: "text",
    content: "const items = await getItems({ limit: 500, favorite: 0 });",
    image_path: null,
    app_source: "VS Code",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 4 * 60 * MINUTE,
  },
  {
    id: 8,
    item_type: "text",
    content: "https://github.com/isnotry/PinPaste",
    image_path: null,
    app_source: "Safari",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 7 * 60 * MINUTE,
  },
  {
    id: 9,
    item_type: "text",
    content: '{"name":"pinpaste","version":"0.4.0","private":false}',
    image_path: null,
    app_source: "VS Code",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 9 * 60 * MINUTE,
  },
  {
    id: 10,
    item_type: "text",
    content: "ssh -T git@github.com",
    image_path: null,
    app_source: "Terminal",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 15 * 60 * MINUTE,
  },
  {
    id: 11,
    item_type: "text",
    content: "Bench notes: polling at 700 ms keeps CPU under 1%.",
    image_path: null,
    app_source: "Notes",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 3 * 60 * MINUTE,
  },
  {
    id: 12,
    item_type: "text",
    content: "brew install rustup-init && rustup default stable",
    image_path: null,
    app_source: "Terminal",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 26 * 60 * MINUTE,
  },
  {
    id: 13,
    item_type: "text",
    content: "TODO: try the Favorites tab and star this manager.",
    image_path: null,
    app_source: "Notes",
    name: null,
    favorite: 0,
    group_id: null,
    created_at: NOW - 30 * 60 * MINUTE,
  },
];

/**
 * 非 Tauri 环境下的后端替身：按命令名返回演示数据，写操作一律空返回。
 */
export function demoCall<T>(cmd: string, args?: Record<string, unknown>): T {
  switch (cmd) {
    case "get_items": {
      const opts = (args ?? {}) as { favorite?: number | null; groupId?: number | null };
      let list = DEMO_ITEMS;
      if (opts.favorite != null) list = list.filter((i) => i.favorite === opts.favorite);
      if (opts.groupId != null) list = list.filter((i) => i.group_id === opts.groupId);
      // 与后端 get_items 的 ORDER BY created_at DESC 保持一致
      return [...list].sort((a, b) => b.created_at - a.created_at) as T;
    }
    case "get_groups":
      return DEMO_GROUPS as T;
    case "get_app_sources":
      return DEMO_APP_SOURCES as T;
    case "get_settings":
      return DEMO_SETTINGS as T;
    case "get_image_data":
      return DEMO_IMAGE_DATA as T;
    case "toggle_pin":
      return false as T;
    default:
      return undefined as T;
  }
}
