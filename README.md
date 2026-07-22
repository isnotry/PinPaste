# PinPaste

跨平台剪贴板管理器（桌面端）。Tauri 2 + React 19 + TypeScript + Vite。

## 技术栈

- 前端：React 19 / TypeScript / Vite 7
- 桌面壳：Tauri 2（Rust，见 `src-tauri/`）
- 质量护栏：ESLint 9 + Prettier 3 + Vitest 3 + husky + lint-staged + GitHub Actions

## 工程规范与质量门禁

本项目把"代码质量把控"固化成了可执行的流程，而不是靠自觉：

- **规范即代码**：ESLint + Prettier 统一风格，提交前自动格式化。
- **质量门禁**：本地 `husky` 在 `git commit` 时对改动文件跑 lint + format；CI 在每次 push / PR 跑 `lint` / `format:check` / `typecheck` / `test`，任一不过则阻断合并。
- **评审文化**：每个 PR 至少 1 人评审，对照 `docs/CODE_REVIEW_CHECKLIST.md`，模板见 `.github/pull_request_template.md`。
- **能力提升**：资深开发者定期复盘，范例见 `docs/CODE_REVIEW_NOTES.md`。

## 本地开发

```bash
npm install          # 安装依赖（含质量工具）
npm run dev          # 启动前端开发服务器
npm run tauri dev    # 启动完整桌面应用（需 Rust 工具链）
```

> 首次拉取代码建议先跑一次 `npm run format`，把历史文件统一到团队格式基线，单独提交这次"格式基线"改动。

## 脚本

| 命令                   | 作用                         |
| ---------------------- | ---------------------------- |
| `npm run dev`          | 前端开发服务器               |
| `npm run build`        | `tsc && vite build` 生产构建 |
| `npm run lint`         | ESLint 静态检查              |
| `npm run format`       | Prettier 格式化全量文件      |
| `npm run format:check` | 仅检查格式是否达标（CI 用）  |
| `npm run typecheck`    | `tsc --noEmit` 类型检查      |
| `npm run test`         | Vitest 跑单测                |
| `npm run test:watch`   | Vitest 监听模式              |

## 测试

用 Vitest + Testing Library，环境为 jsdom。纯逻辑（如 `src/theme.ts` 的主题解析）已覆盖示例测试，新增逻辑请同步补测。

```bash
npm run test
```

## 提交与评审流程

详见 `CONTRIBUTING.md`。要点：

1. 从 `main` 切功能分支
2. 提交前自查 `docs/CODE_REVIEW_CHECKLIST.md`，跑 `lint` / `format` / `typecheck` / `test`
3. `git commit` 自动触发 husky → lint-staged 对本提交文件做 lint + format
4. 提 PR（带模板信息），CI 全绿 + 1 人评审通过方可合并

## 推荐 IDE

VS Code + Tauri 插件 + rust-analyzer。

## 近期变更（2026-07）

### 交互修复

- **双击编辑时键盘事件冒泡**：`EditDialog` 中拦截键盘事件 `stopPropagation()`，防止 Backspace / Delete 等按键冒泡到列表导致误删除。
- **右键菜单删除功能**：`ItemRow` 新增右键上下文菜单，支持直接删除列表项。
- **右键删除 mousedown 竞态**：修复右键菜单"删除"点击不生效问题——背景是 mousedown 事件在菜单关闭前触发，导致点击目标丢失。改为在菜单关闭后再处理删除。

### 功能优化

- **收藏/自动剪切显示逻辑**：收藏视图现在显示每条记录所属分组名；自动剪切视图显示来源与时间信息。
- **收藏改为复制模式**：新增后端 `favorite_item` 命令、重写 `toggleFav`，收藏与自动剪切数据完全隔离，不再共享同一条记录。
- **分组持久化修复**：`saveItem` 由乐观 `setItems` 改为 `updateItem` + `refresh` 全量同步，消除 tab 切换后分组丢失的问题。
