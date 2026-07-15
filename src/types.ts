export type ItemType = "text" | "image" | "rtf" | "file";

export type ThemeMode = "system" | "light" | "dark";

export interface ClipboardItem {
  id: number;
  item_type: ItemType;
  content: string | null;
  image_path: string | null;
  app_source: string | null;
  name: string | null;
  favorite: number; // 0 | 1
  group_id: number | null;
  created_at: number; // unix ms
}

export interface Group {
  id: number;
  name: string;
  color: string;
  sort: number;
}

export interface Settings {
  theme: ThemeMode;
  auto_clean_days: number; // 0 = 关闭；1 / 7 / 30
}
