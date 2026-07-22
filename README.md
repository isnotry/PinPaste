# PinPaste

轻量剪贴板管理器，自动记录你复制过的所有内容，随用随查。

Tauri 2 + React 19 + TypeScript + Vite，macOS 优先。

## 功能一览

- **自动监听剪贴板**：文本和图片都会自动记录，最多保留 1000 条
- **按 App 来源分类**：每条记录自动标记来源应用（如 Safari、微信、VS Code），可按来源筛选
- **搜索过滤**：输入关键词即时过滤，支持空格分词 AND 匹配，大小写不敏感
- **收藏常用内容**：一键收藏，收藏列表独立分组管理
- **编辑内容**：随时修改已记录的文本内容
- **窗口置顶**：需要时一键置顶，始终浮在最前
- **图片预览**：图片记录支持缩略图和大图预览

## 操作指南

### 基本操作

| 操作                   | 效果                                       |
| ---------------------- | ------------------------------------------ |
| **双击条目**           | 复制该条目内容到剪贴板，弹出「已复制」提示 |
| **右键条目**           | 打开菜单，选择「编辑」进入编辑弹窗         |
| **单击条目**           | 选中条目（高亮显示）                       |
| **Backspace / Delete** | 删除选中的条目                             |

### 编辑弹窗

右键条目 → 选择「编辑」，打开编辑窗口：

- **文本内容**：可直接在文本框中编辑，点击「保存」更新记录
- **图片内容**：只读预览，不可编辑
- **收藏切换**：点击星标按钮切换收藏状态
- **删除**：点击底部「删除」按钮删除该条目
- **关闭**：点击遮罩层或按 Esc 关闭弹窗

### 搜索

- 顶部搜索框输入关键词，列表实时过滤
- 多个关键词用空格分隔，匹配需同时包含所有关键词（AND 逻辑）
- 大小写不敏感

### Tab 切换

- **全部**：显示所有剪贴板记录，可按来源 App 筛选
- **收藏**：只显示已收藏的记录，可按分组筛选

### 来源筛选

在「全部」Tab 下，点击底部来源 chips 可按 App 过滤：

- 显示所有曾记录过剪贴板内容的 App 名称
- 点击某个 App 只显示该 App 复制的记录
- 点击「全部」恢复显示所有来源

### 窗口置顶

- 点击侧边栏的置顶按钮，窗口将始终浮在其他窗口之上
- 再次点击取消置顶

### 自动清理

- 默认保留 30 天内的记录，超期自动清理（收藏的记录不会被清理）
- 可在设置中调整保留天数，设为 0 则关闭自动清理

## 快捷键

| 快捷键                 | 效果                           |
| ---------------------- | ------------------------------ |
| `↑` / `↓`              | 上下移动选中条目               |
| `Enter`                | 粘贴选中条目内容到当前输入位置 |
| `Backspace` / `Delete` | 删除选中条目                   |
| `Esc`                  | 清空搜索框 / 关闭弹窗          |
| `Cmd + F`              | 聚焦搜索框                     |

> 粘贴功能需要授予辅助功能权限（macOS 首次使用会提示授权）

## 本地开发

### 环境要求

- Node.js 22+
- Rust（stable 工具链）
- macOS：Xcode Command Line Tools

### 启动

```bash
npm install          # 安装前端依赖
npm run tauri dev    # 启动完整桌面应用（前端 + Rust 后端）
```

### 脚本

| 命令                   | 作用                         |
| ---------------------- | ---------------------------- |
| `npm run dev`          | 仅启动前端开发服务器         |
| `npm run build`        | 生产构建（tsc + vite build） |
| `npm run tauri dev`    | 启动桌面应用（开发模式）     |
| `npm run tauri build`  | 打包桌面应用（发布模式）     |
| `npm run lint`         | ESLint 静态检查              |
| `npm run format`       | Prettier 格式化全部文件      |
| `npm run format:check` | 仅检查格式（CI 用）          |
| `npm run typecheck`    | TypeScript 类型检查          |
| `npm run test`         | Vitest 单元测试              |
| `npm run test:watch`   | Vitest 监听模式              |

## 技术栈

| 层       | 技术                                      |
| -------- | ----------------------------------------- |
| 前端     | React 19 / TypeScript / Vite 7            |
| 桌面壳   | Tauri 2（Rust）                           |
| 样式     | 纯 CSS（无 UI 框架）                      |
| 质量护栏 | ESLint 9 / Prettier 3 / Vitest 3          |
| Git 钩子 | husky + lint-staged                       |
| CI       | GitHub Actions（lint / typecheck / test） |

## 项目结构

```
pinpaste/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   │   ├── ItemList.tsx    # 列表容器
│   │   ├── ItemRow.tsx     # 单条记录行
│   │   ├── EditDialog.tsx  # 编辑弹窗
│   │   ├── ImageThumb.tsx  # 图片缩略图
│   │   └── ImagePreview.tsx# 图片大图预览
│   ├── hooks/              # 自定义 Hook
│   │   ├── useClipboardData.ts  # 剪贴板数据管理
│   │   └── useKeyboardNav.ts    # 键盘导航
│   ├── api.ts              # Tauri 后端调用封装
│   ├── App.tsx             # 主应用
│   └── App.css             # 全局样式
├── src-tauri/              # Rust 后端
│   ├── src/lib.rs          # 核心逻辑（监听、存储、窗口管理）
│   ├── Cargo.toml          # Rust 依赖
│   └── capabilities/       # Tauri 权限配置
└── package.json
```

## 质量门禁

- **提交前**：husky + lint-staged 自动对改动文件跑 ESLint + Prettier
- **CI**：每次 push / PR 跑 `lint` / `format:check` / `typecheck` / `test`，任一不过则阻断合并
- **测试**：Vitest + Testing Library，环境为 jsdom

## 版本历史

| 版本   | 说明                                                                             |
| ------ | -------------------------------------------------------------------------------- |
| v0.3.0 | 功能完整版：App 来源绑定、搜索、编辑弹窗、收藏重写、置顶、双击复制、过滤自身来源 |
| v0.2.0 | 代码评审整改                                                                     |
| v0.1.0 | 工程基线建立                                                                     |

## License

MIT
