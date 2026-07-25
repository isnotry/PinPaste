# PinPaste 文档

> 剪贴板历史管理器 · Tauri 2 + React 19 + Rust

## 概述

PinPaste 是一款 macOS 原生剪贴板历史管理工具，功能涵盖：

- **剪贴板监听**：自动记录文本和图片历史，最多保留 1000 条
- **按 App 来源分类**：每条记录自动标记来源应用，可按来源筛选
- **双击复制**：双击列表条目直接复制内容到剪贴板
- **快捷粘贴**：选中条目后按 Enter 直接粘贴到当前应用
- **收藏夹**：重要条目加星标记，永不自动清理
- **分组管理**：颜色标签分类
- **搜索过滤**：实时搜索，空格分词 AND 匹配，大小写不敏感
- **卡片网格布局**：窗口拉宽时自动切换为多列卡片平铺
- **中英文切换**：支持中文/英文界面语言
- **自动清理**：按 1 / 7 / 30 天自动清除未收藏的旧条目
- **系统托盘**：菜单栏常驻，全局快捷键呼出/隐藏

---

## 目录结构

```
pinpaste/
├── src/                          # React 前端（TypeScript）
│   ├── components/               # UI 组件
│   │   ├── ItemList.tsx          # 列表容器
│   │   ├── ItemRow.tsx           # 单条记录行
│   │   ├── EditDialog.tsx        # 编辑弹窗
│   │   ├── ImageThumb.tsx        # 图片缩略图
│   │   ├── ImagePreview.tsx      # 图片大图预览
│   │   └── SettingsPanel.tsx     # 设置面板
│   ├── hooks/                    # 自定义 Hook
│   │   ├── useClipboardData.ts   # 剪贴板数据管理
│   │   ├── useKeyboardNav.ts     # 键盘导航
│   │   └── useLang.ts            # 语言管理
│   ├── i18n.ts                   # 国际化字典
│   ├── api.ts                    # Tauri invoke 调用封装
│   ├── types.ts                  # TypeScript 类型定义
│   ├── theme.ts                  # 主题解析与应用
│   ├── config.ts                 # 配置常量
│   ├── utils.ts                  # 工具函数
│   ├── App.tsx                   # 主应用
│   └── App.css                   # 全局样式（设计系统 v2）
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 程序入口
│   │   └── lib.rs                # 全部 Tauri 命令 + 业务逻辑
│   ├── Cargo.toml                # Rust 依赖
│   ├── tauri.conf.json           # Tauri 配置
│   └── capabilities/             # 权限配置
├── docs/                         # 本文档
│   ├── design.md                 # 设计系统文档
│   ├── CODE_REVIEW_CHECKLIST.md  # 代码评审清单
│   ├── CODE_REVIEW_NOTES.md      # 评审笔记
│   └── README.md                 # 本文件
├── CHANGELOG.md                  # 版本变更记录
├── CONTRIBUTING.md               # 贡献指南
├── overview.md                   # 工程化概览
└── package.json
```

---

## 技术架构

### 前端：React 19 + TypeScript + Vite 7

- 纯 CSS 设计令牌系统（无 UI 框架），亮/暗/跟随系统三档主题
- 自建轻量 i18n（中/英双语，60+ 翻译条目）
- 响应式布局：`@media` query 实现窗口宽度自适应（单列 ↔ 卡片网格）
- 组件分层：App.tsx 作为组合根，逻辑下沉到 hooks/

### 后端：Rust + Tauri 2

| 依赖                           | 作用                              |
| ------------------------------ | --------------------------------- |
| `rusqlite`                     | SQLite 数据库存储历史、分组、设置 |
| `arboard`                      | 系统剪贴板读写（文本 + 图片）     |
| `enigo`                        | 模拟键盘输入（粘贴快捷键）        |
| `image`                        | PNG 图片编解码                    |
| `base64`                       | 图片 dataURL 编码                 |
| `tauri-plugin-global-shortcut` | 全局快捷键注册                    |
| `tauri` (tray-icon)            | 系统托盘菜单                      |
| `objc2-app-kit`                | macOS 前台 App 名称获取           |

**监听线程**：独立线程每 700ms 轮询剪贴板内容；通过 `Suppress` 机制防止程序自身写入剪贴板后被重复入库。过滤 PinPaste 自身作为来源的记录。

---

## 数据库 Schema

```sql
CREATE TABLE items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_type   TEXT    NOT NULL,          -- 'text' | 'image' | 'rtf' | 'file'
    content     TEXT,                       -- 文本内容（图片时为 NULL）
    image_path  TEXT,                       -- PNG 路径（文本时为 NULL）
    app_source  TEXT,                       -- 来源应用名称
    name        TEXT,                       -- 用户自定义名称
    favorite    INTEGER NOT NULL DEFAULT 0, -- 1=已收藏
    group_id    INTEGER,                    -- 关联分组
    created_at  INTEGER NOT NULL            -- Unix 毫秒时间戳
);

CREATE TABLE groups (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL,
    color TEXT    NOT NULL DEFAULT '#3b82f6',
    sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT
    -- 已知键: theme(system|light|dark), auto_clean_days(0|1|7|30),
    --        pinned(0|1), lang(zh|en)
);
```

**数据存放路径**：`~/Library/Application Support/com.kingsir.pinpaste/`

- `pinpaste.db` — 数据库
- `images/` — 图片 PNG 文件

---

## Tauri 命令一览

| 命令               | 前端调用                   | 说明                                                   |
| ------------------ | -------------------------- | ------------------------------------------------------ |
| `get_items`        | `getItems(opts)`           | 查询条目，支持 limit/search/groupId/favorite/appSource |
| `get_groups`       | `getGroups()`              | 查询全部分组                                           |
| `get_app_sources`  | `getAppSources()`          | 查询去重后的来源 App 列表                              |
| `get_active_app`   | `getActiveApp()`           | 获取当前前台 App 名称                                  |
| `create_group`     | `createGroup(name, color)` | 新建分组                                               |
| `update_group`     | `updateGroup(id, patch)`   | 更新分组名称/颜色                                      |
| `delete_group`     | `deleteGroup(id)`          | 删除分组（条目的 group_id 置 NULL）                    |
| `get_settings`     | `getSettings()`            | 读取 theme/auto_clean_days/pinned/lang                 |
| `save_settings`    | `saveSettings(patch)`      | 保存设置                                               |
| `get_image_data`   | `getImageData(id)`         | 读取图片条目，返回 base64 dataURL                      |
| `delete_item`      | `deleteItem(id)`           | 删除条目（含图片文件引用计数清理）                     |
| `update_item`      | `updateItem(id, patch)`    | 更新 name/content/favorite/groupId                     |
| `favorite_item`    | `favoriteItem(id)`         | 收藏条目（UPDATE favorite=1）                          |
| `unfavorite_item`  | `unfavoriteItem(id)`       | 取消收藏（UPDATE favorite=0）                          |
| `copy_item`        | `copyItem(id)`             | 复制条目到系统剪贴板                                   |
| `paste_item`       | `pasteItem(id)`            | 复制到剪贴板 + 模拟 Cmd+V 粘贴                         |
| `hide_main_window` | `hideMainWindow()`         | 隐藏窗口                                               |
| `toggle_pin`       | `togglePin()`              | 切换窗口置顶（持久化到 settings）                      |

---

## 全局快捷键

| 快捷键        | 行为                    |
| ------------- | ----------------------- |
| `Cmd+Shift+V` | 呼出/隐藏主窗口         |
| `↑ / ↓`       | 在列表中上/下移动选中项 |
| `Enter`       | 粘贴选中条目            |
| `Cmd+F`       | 聚焦搜索框              |
| `Esc`         | 清空搜索 / 关闭弹窗     |

> 粘贴功能需要授予辅助功能权限（macOS 首次使用会提示授权）

---

## 主题系统

CSS Variables 实现三态主题切换：

```css
:root,
[data-theme="light"] {
  --bg: #f7f8fa;
  --accent: #5b6cff; /* 靛蓝 */
}
[data-theme="dark"] {
  --bg: #0f1115;
  --accent: #7c8aff;
}
```

`theme.ts` 提供 `resolveMode` / `applyMode` / `watchSystemTheme`，跟随系统模式下监听 `prefers-color-scheme`。

详见 [design.md](./design.md)。

---

## 构建与发布

```bash
# 安装依赖
npm install

# 开发调试（前端热重载 + Rust 编译）
npm run tauri dev

# 生产构建（生成 .app / .dmg）
npm run tauri build
```

构建产物在 `src-tauri/target/release/bundle/macos/`。

**macOS 权限要求**：

- 辅助功能（`enigo` 模拟按键）→ 系统设置 → 隐私与安全性 → 辅助功能

---

## 质量门禁

- **提交前**：husky + lint-staged（ESLint + Prettier）
- **CI**：GitHub Actions（lint / format:check / typecheck / test）
- **测试**：Vitest + Testing Library，43/43 通过

---

## 相关文档

- [设计系统文档](./design.md) — 设计令牌、组件规范、踩坑记录
- [变更记录](../CHANGELOG.md) — 版本历史
- [代码评审清单](./CODE_REVIEW_CHECKLIST.md) — 团队统一评审口径
- [代码评审笔记](./CODE_REVIEW_NOTES.md) — 首次评审 P0/P1/P2 分级记录
- [工程化概览](../overview.md) — 质量地基建设记录
- [贡献指南](../CONTRIBUTING.md) — 开发流程与规范

---

_最后更新：2026-07-26_
