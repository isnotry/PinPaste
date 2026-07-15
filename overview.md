# PinPaste 工程化质量地基 — 完成概览

## 目标

为 pinpaste（Tauri 2 + React 19 + TS + Vite 的跨平台剪贴板管理器）补齐工程化质量地基，并通过真实评审示范带动团队。

## 已完成

- 初始化 git 仓库（此前项目缺 `.git`），默认分支 `main`，提交**未推送**，打 tag `v0.1.0`。
- 四道质量门禁全部实测通过：
  - `npm run lint` → ESLint 9（`eslint .` 全量）
  - `npm run format:check` → Prettier 3 格式校验
  - `npm run typecheck` → `tsc --noEmit`
  - `npm run test` → Vitest，7/7 通过
- 提交前门禁：husky pre-commit + lint-staged（`eslint --fix` + `prettier --write`）。
- CI：GitHub Actions 跑 lint / format:check / typecheck / test。
- 评审机制：代码评审 Checklist、PR 模板、CONTRIBUTING、README 团队指南、带头评审笔记（P0/P1/P2 分级）。

## 关键决策与踩坑

1. **Prettier 无法解析 `*.svg`** → `.prettierignore` 忽略 `*.svg`，否则 `format:check` 与提交钩子失败。
2. **`vitest.config.ts` 顶部 `/// <reference types="vitest/config" />`** 触发 `@typescript-eslint/triple-slash-reference` → 删除，改用 `import`。
3. **lint 脚本从 `eslint src` 扩为 `eslint .`**，保证 CI 与提交钩子检查范围一致（否则会出现 CI 绿、本地钩子红的不一致）。
4. 历史文件已用 `prettier --write` 统一格式基线。

## 交付文件

- 配置：`eslint.config.js`、`.prettierrc`、`.prettierignore`、`vitest.config.ts`、`.github/workflows/ci.yml`、`.husky/pre-commit`、`.gitignore`（增补 Tauri target/coverage/.workbuddy）
- 测试：`src/test/setup.ts`、`src/theme.test.ts`
- 文档：`README.md`、`CONTRIBUTING.md`、`docs/CODE_REVIEW_CHECKLIST.md`、`docs/CODE_REVIEW_NOTES.md`、`.github/pull_request_template.md`

## 第二轮：P0/P1/P2 逐项整改（2026-07-16，已落地，tag v0.2.0）

按 `docs/CODE_REVIEW_NOTES.md` 全部整改完成，四道门禁 + `npm run build` 全绿，测试 14/14 通过。

- **P0-1 错误处理**：`api.ts` 新增 `ApiError` 类 + `call()` 统一封装，所有后端调用失败带中文上下文；移除全部裸 `.catch(()=>{})`，改为 `console.error` + `showToast`（ApiError 中文信息）。
- **P0-2 类型收紧**：`saveSettings` 用 `Partial<Pick<Settings,"theme"|"auto_clean_days">>`（theme 收敛为 `ThemeMode`），`updateGroup`/`updateItem` 复用 `Group`/`ClipboardItem` 类型。
- **P0-3 拆分上帝组件**：`App.tsx`（581→~330 行）拆为 `src/hooks/useClipboardData.ts`、`src/hooks/useKeyboardNav.ts` 与 `src/components/{ItemList,ItemRow,SettingsPanel,EditDialog,ImageThumb}.tsx`。
- **P1-4 下标→id**：选中状态由数组下标改为业务 `id`（`itemRefs` 改为 `Map<id,HTMLElement>`），避免过滤/删除后错选。
- **P1-5 去断言**：移除 `setMode(s.theme as ThemeMode)` 多余断言（根源已从 P0-2 收紧）。
- **P1-6 图片终态**：`ImageThumb` 增加 `loading/ok/error` 三态，失败显示占位图标而非无限 `⏳`。
- **P2-7 可测试化**：`fuzzyMatch`/`fmtTime` 抽到 `src/utils.ts`，新增 `src/utils.test.ts`（7 例）。
- **P2-8 配置外提**：`GROUP_COLORS` 抽到 `src/config.ts`。

## 下一步（建议）

- 推送到远端并启用分支保护 + CI 必过。
- 后续新增组件继续走 hooks/components 分层，保持 `App.tsx` 作为组合根。
