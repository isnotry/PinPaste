# PinPaste · 剪贴板管理器

**简体中文** | [English](README.en.md)

![平台 macOS](https://img.shields.io/badge/platform-macOS-lightgrey)
![Tauri 2](https://img.shields.io/badge/Tauri-2-blue)
![数据只存本机](https://img.shields.io/badge/data-local--only-orange)
![无服务端](https://img.shields.io/badge/backend-none-brightgreen)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

> 复制过的东西一条不漏地留在本机 SQLite 里，⌘ + ⇧ + V 一按呼出，Enter 直接贴回光标处。

![界面截图](https://cdn.jsdelivr.net/gh/isnotry/PinPaste@main/docs/screenshot.png)

**[下载与版本](https://github.com/isnotry/PinPaste/releases)**

---

## 它是什么

PinPaste 是一款 macOS 桌面剪贴板历史工具：后台常驻并记录你复制过的文本与图片，随时呼出、搜索、收藏、粘贴回去。

形态是 Tauri 2 壳（Rust 后端 + React 19 前端），没有服务端、没有账号、不联网 —— 全部数据落在本机的一个 SQLite 文件里，窗口默认 440 × 620，用完即隐。

## 特性

- **自动记录** —— 后台线程每 700 ms 轮询一次剪贴板，文本与图片都存，同内容不重复入库
- **粘贴回光标处** —— 选中条目按 Enter，写回剪贴板后模拟一次 ⌘ + V，直接落在当前输入框
- **来源标记** —— 每条记录自动带上复制时的前台 App（如 Safari、VS Code），可按来源筛选
- **收藏与分组** —— 星标收藏永不自动清理，收藏项可归入带颜色的分组
- **即时搜索** —— 空格分词 AND 匹配、大小写不敏感，同时匹配内容与名称
- **图片历史** —— 图片以 PNG 存盘，列表显示缩略图，点击看大图
- **窗口置顶** —— 📌 一键钉在最前，状态持久化，重启后恢复
- **自动清理** —— 按 1 / 7 / 30 天清理未收藏的旧条目，可关闭；总量超过 1000 条时从最旧的未收藏项开始丢
- **轻量常驻** —— 菜单栏托盘常驻，全局快捷键呼出 / 隐藏，失焦自动隐藏
- **中英双语界面** —— 内置 43 条翻译，跟随系统语言自动选择

## 快速开始

### 运行桌面应用

```bash
npm install          # 安装前端依赖
npm run tauri dev    # 启动完整桌面应用（前端 + Rust 后端）
```

环境要求：Node.js 22+、Rust stable 工具链、macOS 需装 Xcode Command Line Tools。首次使用「粘贴」功能时，macOS 会弹窗请求辅助功能权限 —— 允许后才能在别的应用里模拟 ⌘ + V。

### 打包安装包

```bash
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/`。也可以直接从 [Releases](https://github.com/isnotry/PinPaste/releases) 下载现成的 dmg —— 未做 Apple 开发者签名，首次打开需在「系统设置 → 隐私与安全性」里点「仍要打开」，或右键 App 选「打开」。

### 浏览器里看界面

```bash
npm run dev          # 打开 http://localhost:1420
```

非 Tauri 环境下不调后端，界面加载 `src/demo.ts` 里的演示数据 —— 用来预览 UI 和拍截图，方便不装 Rust 就上手改样式。

## 界面说明

| 位置         | 元素                   | 作用                                           |
| ------------ | ---------------------- | ---------------------------------------------- |
| 顶栏         | 搜索框                 | 输入关键词实时过滤当前 Tab                     |
| 顶栏         | 📌                     | 切换窗口置顶，状态写入 `settings.pinned`       |
| 顶栏         | ⚙️                     | 打开设置面板                                   |
| Tab          | ★ 收藏 / 自动剪切      | 收藏项列表 / 全部剪贴板历史                    |
| 侧边栏       | 全部                   | 取消筛选，显示全部条目                         |
| 侧边栏       | 分组名（收藏 Tab）     | 按分组筛选，左侧色条为分组颜色                 |
| 侧边栏       | 当前 · App（剪切 Tab） | 只看当前前台 App 复制的内容                    |
| 侧边栏       | 各来源 App             | 按来源筛选，列表来自 `get_app_sources`         |
| 列表条目     | 内容 / 名称            | 图片条目显示缩略图 + 文件名                    |
| 列表条目     | 时间 · 来源            | `MM-DD HH:mm`，收藏 Tab 下显示分组名           |
| 条目右侧     | ☆ / ★                  | 切换收藏，收藏项不受自动清理与 1000 条上限影响 |
| 设置面板     | 主题                   | 跟随系统 / 浅色 / 深色                         |
| 设置面板     | 自动清理               | 关闭 / 1 / 7 / 30 天                           |
| 设置面板     | 语言                   | 中文 / English                                 |
| 设置面板     | 分组管理               | 改分组名、取色、删除、新增                     |
| 设置面板底部 | GitHub 开源仓库        | 跳转到源码仓库                                 |

## 快捷键

| 按键                | 效果                                |
| ------------------- | ----------------------------------- |
| `⌘ + ⇧ + V`（全局） | 呼出 / 隐藏 PinPaste 窗口           |
| `↑` / `↓`           | 在过滤后的列表里上下移动选中项      |
| `Enter`             | 把选中条目粘贴到当前输入位置        |
| `Backspace`         | 删除选中条目（搜索框为空时生效）    |
| `Esc`               | 关闭设置 / 编辑弹窗，否则隐藏窗口   |
| 双击条目            | 复制该条目内容到剪贴板              |
| 右键条目            | 打开菜单 → 编辑（内容、分组、删除） |

窗口未置顶时失焦即自动隐藏，所以「复制别处 → 呼出 → Enter」这条链路不用手动关窗口。

## 工作方式

监听循环（Rust 后台线程，700 ms 一轮）：

```text
图片：board.get_image() 成功 且 hash 与上次不同  → 存图片
文本：非空 且 trim 后与上次不同                  → 存文本
来源：取当前前台 App 名，等于 PinPaste 时跳过（不记录自己写回的内容）
```

自动清理与容量上限：

```text
过期清理：created_at < now - days × 24h 且 favorite = 0  → 删除（图片文件一并删除）
          天数默认 30，可选 1 / 7 / 30，设 0 为关闭；每次启动时执行一次
容量上限：COUNT(items) > 1000 → 按 created_at 升序删除最旧的未收藏项
```

收藏项（`favorite = 1`）在两条规则里都豁免 —— 只要加过星，就不会被自动删掉。

## 数据与隐私

不联网、无账号、无埋点：数据只写进本机 `app_data_dir`，卸载即随目录删除。

| 位置                               | 内容                                              |
| ---------------------------------- | ------------------------------------------------- |
| `app_data_dir/pinpaste.db`         | SQLite 库：`items` / `groups` / `settings` 三张表 |
| `app_data_dir/images/`             | 复制过的图片，按 PNG 存盘                         |
| `settings.auto_clean_days`         | 自动清理天数（默认 30）                           |
| `settings.pinned`                  | 窗口置顶状态                                      |
| `settings.lang`                    | 界面语言                                          |
| localStorage `pinpaste-lang`       | 前端语言偏好（启动时先读它，其次浏览器语言）      |
| localStorage `pinpaste-theme-mode` | 主题模式：`system` / `light` / `dark`             |

唯一需要授权的是**辅助功能**：粘贴要用 `enigo` 模拟一次 ⌘ + V。读取剪贴板本身不需要任何权限。

## 目录结构

```text
pinpaste/
├── src/                        # React 19 + TypeScript 前端
│   ├── components/             # ItemList / ItemRow / EditDialog / ImageThumb / ImagePreview / SettingsPanel
│   ├── hooks/                  # useClipboardData（数据层）/ useKeyboardNav（键盘）/ useLang（语言）
│   ├── i18n.ts                 # 中英字典与取词函数（43 条）
│   ├── api.ts                  # Tauri 命令封装，统一错误为 ApiError
│   ├── demo.ts                 # 浏览器预览用的演示数据（非 Tauri 环境生效）
│   ├── types.ts                # 前端共享类型
│   ├── theme.ts                # 主题解析、持久化与系统主题监听
│   ├── utils.ts                # 搜索匹配与时间格式化
│   ├── App.tsx                 # 主应用
│   └── App.css                 # 全局样式（设计令牌系统）
├── src-tauri/
│   ├── src/lib.rs              # 全部 Tauri 命令、监听线程、SQLite 读写
│   ├── Cargo.toml              # Rust 依赖（rusqlite / arboard / enigo）
│   ├── tauri.conf.json         # 窗口、托盘、打包配置
│   └── capabilities/           # 权限配置
├── docs/
│   └── design.md               # 设计系统文档（配色、间距、组件样式）
├── .github/workflows/ci.yml    # CI：lint / format / typecheck / test
├── CHANGELOG.md
├── CONTRIBUTING.md
└── overview.md
```

## 开发说明

| 命令                   | 作用                           |
| ---------------------- | ------------------------------ |
| `npm run dev`          | 只起前端（演示数据，不开后端） |
| `npm run tauri dev`    | 起完整桌面应用                 |
| `npm run tauri build`  | 打包安装包                     |
| `npm run lint`         | ESLint 检查                    |
| `npm run format`       | Prettier 格式化全部文件        |
| `npm run format:check` | 只检查格式（CI 用）            |
| `npm run typecheck`    | TypeScript 类型检查            |
| `npm run test`         | Vitest 单元测试（43 项）       |

几条约定：

- 样式不用 UI 框架，全部走 `App.css` 里的设计令牌，改色改间距先看 `docs/design.md`
- 新增 Tauri 命令要同时改三处：`src-tauri/src/lib.rs`、`src-tauri/capabilities/`、`src/api.ts`
- Rust 命令参数按 camelCase 接收，`api.ts` 里已处理 `group_id` → `groupId` 的转换
- 前端不吞错：后端调用失败统一抛 `ApiError`，由 UI 决定是 `console.error` 还是给用户 toast
- CI 只跑前端质量门禁（lint / format / typecheck / test），Tauri 打包在发版时另跑

## 平台支持

| 平台            | 状态                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| macOS           | 完整支持：来源 App 识别（NSWorkspace）、全局快捷键、托盘、辅助功能粘贴 |
| Windows / Linux | 可编译运行，来源 App 识别暂未实现（标记为「未知」），其余功能一致      |

已知限制：来源识别只在 macOS 上有效；全局快捷键目前注册的是 `cmd+shift+v`，非 macOS 平台需自行调整。

## 许可

[MIT](LICENSE) © 2026 isnotry
