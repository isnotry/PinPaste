# PinPaste 文档

> 剪贴板历史管理器 · Tauri + React + Rust

## 概述

PinPaste 是一款 macOS 原生剪贴板历史管理工具，运行于菜单栏，功能涵盖：

- **剪贴板监听**：自动记录文本和图片历史，最多保留 1000 条
- **快捷粘贴**：选中条目后直接粘贴到当前应用（模拟 `Cmd/Ctrl+V`）
- **收藏夹**：重要条目加星标记，永不自动清理
- **分组管理**：颜色标签分类，支持模糊搜索
- **OCR 圈选识别**：macOS Vision 离线识别截图中的文字（macOS 专属）
- **自动清理**：按 1 / 7 / 30 天自动清除未收藏的旧条目
- **系统托盘**：菜单栏常驻，`Cmd+Shift+V` 全局呼出/隐藏

---

## 目录结构

```
pinpaste/
├── src/                          # React 前端（TypeScript）
│   ├── App.tsx                   # 主组件：UI、状态、交互
│   ├── App.css                   # 样式（CSS Variables 双主题）
│   ├── api.ts                    # Tauri invoke 调用封装
│   ├── types.ts                  # TypeScript 类型定义
│   ├── theme.ts                  # 主题解析与应用
│   └── main.tsx                  # React 入口
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 程序入口，调用 lib::run()
│   │   └── lib.rs                # 全部 Tauri 命令 + 业务逻辑
│   ├── ocr_helper/               # macOS 原生 OCR 助手（Objective-C / Vision）
│   │   └── ocr_helper.m
│   ├── Cargo.toml                # Rust 依赖
│   ├── tauri.conf.json           # Tauri 配置（窗口、权限、bundle）
│   └── capabilities/
│       └── default.json          # 前端可用权限
├── docs/                         # 本文档
├── package.json                  # Node 依赖（Vite / React / Tauri CLI）
└── vite.config.ts
```

---

## 技术架构

### 前端：React 19 + TypeScript + Vite

- 窗口尺寸 440×620px，`alwaysOnTop`，默认隐藏
- CSS Variables 实现亮/暗/跟随系统三档主题
- 列表虚拟化（按需渲染上限 500 条）
- OCR 浮层：后端创建全屏透明 overlay 窗口承载截图，用户直接在屏幕上拖拽圈选，全程无 window API 权限问题

### 后端：Rust + Tauri 2

| 依赖                           | 作用                              |
| ------------------------------ | --------------------------------- |
| `rusqlite`                     | SQLite 数据库存储历史、分组、设置 |
| `arboard`                      | 系统剪贴板读写（文本 + 图片）     |
| `enigo`                        | 模拟键盘输入（粘贴快捷键）        |
| `image`                        | PNG 图片编解码（存/取/裁剪）      |
| `base64`                       | 图片 dataURL 编码                 |
| `tauri-plugin-global-shortcut` | 全局快捷键注册                    |
| `tauri` (tray-icon)            | 系统托盘菜单                      |

**监听线程**：独立线程每 700ms 轮询剪贴板内容；通过 `Suppress` 机制防止程序自身写入剪贴板后被重复入库。

**OCR（macOS）**：调用 `screencapture -x` 截全屏 → 恢复窗口 → 前端展示截图并画框 → 后端用 Vision 框架识别。

---

## 数据库 schema

```sql
-- 剪贴板条目
CREATE TABLE items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_type   TEXT    NOT NULL,          -- 'text' | 'image' | 'rtf' | 'file'
    content     TEXT,                       -- 文本内容（图片时为 NULL）
    image_path  TEXT,                       -- PNG 路径（文本时为 NULL）
    app_source  TEXT,                       -- 来源应用（当前未填充）
    name        TEXT,                       -- 用户自定义名称
    favorite    INTEGER NOT NULL DEFAULT 0, -- 1=已收藏
    group_id    INTEGER,                    -- 关联分组
    created_at  INTEGER NOT NULL            -- Unix 毫秒时间戳
);

-- 分组标签
CREATE TABLE groups (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL,
    color TEXT    NOT NULL DEFAULT '#3b82f6',
    sort  INTEGER NOT NULL DEFAULT 0
);

-- 设置
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);
```

**数据存放路径**：`~/Library/Application Support/com.kingsir.pinpaste/`

- `pinpaste.db` — 数据库
- `images/` — 图片 PNG 文件

---

## 全局快捷键

| 快捷键        | 行为                    |
| ------------- | ----------------------- |
| `Cmd+Shift+V` | 呼出/隐藏主窗口         |
| `↑ / ↓`       | 在列表中上/下移动选中项 |
| `Enter`       | 粘贴选中条目            |
| `Esc`         | 关闭弹窗 / 隐藏窗口     |

---

## Tauri 命令一览

| 命令                 | 前端调用                   | 说明                                                            |
| -------------------- | -------------------------- | --------------------------------------------------------------- |
| `get_items`          | `getItems(opts)`           | 查询条目，支持 limit/search/groupId/favorite 过滤               |
| `get_groups`         | `getGroups()`              | 查询全部分组                                                    |
| `create_group`       | `createGroup(name, color)` | 新建分组                                                        |
| `update_group`       | `updateGroup(id, patch)`   | 更新分组名称/颜色                                               |
| `delete_group`       | `deleteGroup(id)`          | 删除分组（条目的 group_id 置 NULL）                             |
| `get_settings`       | `getSettings()`            | 读取 theme / auto_clean_days                                    |
| `save_settings`      | `saveSettings(patch)`      | 保存设置（变更 auto_clean_days 时立即执行清理）                 |
| `get_image_data`     | `getImageData(id)`         | 读取图片条目，返回 base64 dataURL                               |
| `delete_item`        | `deleteItem(id)`           | 删除条目（含图片文件清理）                                      |
| `update_item`        | `updateItem(id, patch)`    | 更新 name / favorite / groupId                                  |
| `copy_item`          | `copyItem(id)`             | 复制条目到系统剪贴板（不自动粘贴）                              |
| `paste_item`         | `pasteItem(id)`            | 复制到剪贴板 + 模拟 Cmd/Ctrl+V 粘贴                             |
| `ocr_snapshot`       | `ocrSnapshot()`            | 隐藏主窗口→截全屏→创建全屏透明 overlay 窗口（macOS）            |
| `ocr_recognize`      | `ocrRecognize(x,y,w,h)`    | 裁剪全屏截图区域 + 调用 Vision OCR → 文字入库+写剪贴板（macOS） |
| `hide_ocr_overlay`   | `hideOcrOverlay()`         | 关闭 overlay 窗口并恢复主窗口（macOS）                          |
| `finish_ocr_overlay` | `finishOcrOverlay()`       | 同上（OCR 完成后调用，关闭 overlay 恢复主窗口）                 |
| `hide_main_window`   | `hideMainWindow()`         | 前端失焦时隐藏窗口（避免直接操作 window API）                   |

---

## OCR 工作流程（macOS）

```
用户点击 🔍 按钮
    ↓
前端调用 ocr_snapshot()
    ↓
后端：隐藏主窗口 → screencapture -x 截全屏 → 恢复主窗口
    ↓
后端：创建全屏透明 overlay 窗口（WebviewWindowBuilder）
    ↓
后端：通过 overlay.eval() 注入 HTML（含全屏截图背景 + 屏幕坐标画框 JS）
    ↓
用户在 overlay 上拖拽圈选文字区域
    ↓
Overlay JS：鼠标松开 → ipcRenderer.emit('ocr-select', {x,y,w,h})
    ↓
后端监听 ocr-select 事件 → 转发到主窗口前端
    ↓
前端收到 ocr-select → 调用 ocr_recognize(x,y,w,h)
    ↓
后端：从缓存全屏 PNG 裁剪 → 调用 ocr_helper（Vision 框架）→ 文字输出
    ↓
文字入库 + 写入系统剪贴板 + 发送 clipboard-new 事件
    ↓
后端：关闭 overlay 窗口 + 恢复显示主窗口
    ↓
前端显示 Toast 提示
```

> **ocr_helper** 是独立编译的 macOS 原生可执行文件。编译与打包已**自动化**：
>
> - `src-tauri/build.rs` 在 `cargo build` 时用 `clang` 编译 `ocr_helper.m`，产出 `target/<profile>/ocr_helper`；
> - 同时复制为 `src-tauri/binaries/ocr_helper-<target>`（带架构后缀）；
> - `tauri.conf.json` 的 `bundle.externalBin` 在打包时把它作为 sidecar 放进 `.app/Contents/MacOS/`，运行时 `find_ocr_helper` 即可在 `exe.parent()` 找到它。
>
> 若 Xcode Command Line Tools 缺失，构建会直接失败并给出明确提示（`xcode-select --install`）。

---

## 主题系统

前端通过 CSS Variables 实现：

```css
:root,
[data-theme="light"] {
  --bg: #f5f6f8;
  --text: #1f2329;
  --accent: #3b82f6;
}
[data-theme="dark"] {
  --bg: #16181d;
  --text: #e6e8eb;
  --accent: #4b91f4;
}
```

`theme.ts` 提供 `resolveMode` / `applyMode` / `watchSystemTheme`，跟随系统模式下监听 `prefers-color-scheme` 媒体查询变化。

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

- 屏幕录制（`screencapture`）→ 系统设置 → 隐私与安全性 → 屏幕录制 **【OCR 必需】**
- 辅助功能（`enigo` 模拟按键）→ 系统设置 → 隐私与安全性 → 辅助功能

> ⚠️ **OCR 必须授予「屏幕录制」权限**。未授予时：
>
> - 多数情况 `screencapture` 直接失败，应用会报错并提示去系统设置开启；
> - 部分 macOS 版本会返回一张**纯黑图（退出码仍为 0）**，代码已检测纯色截图并给出同样的明确指引，而非静默“未识别到文字”。
> - **授权后必须重启应用**才能生效。

---

## 待完成 / 改进方向

- [ ] OCR 助手 `ocr_helper` 自动化编译打包（写入 Tauri build 脚本）
- [ ] `app_source` 来源应用字段填充（需 macOS Accessibility API）
- [ ] Windows/Linux 平台适配（OCR 功能在非 macOS 上禁用）
- [ ] 搜索增强：正则匹配、按日期范围筛选
- [ ] 多选批量操作（批量删除/移动分组）
- [ ] 导入/导出剪贴板历史
- [ ] 云同步（iCloud / 自建服务器）

---

_最后更新：2026-07-12_
