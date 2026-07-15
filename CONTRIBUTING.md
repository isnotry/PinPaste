# 贡献指南（PinPaste）

本文件定义团队统一的本地环境与协作规范，目的是让"代码质量把控"变成可执行的流程，而不是靠自觉。

## 1. 技术栈

- 前端：React 19 + TypeScript + Vite 7
- 桌面壳：Tauri 2（Rust，见 `src-tauri/`）
- 质量工具：ESLint 9 + Prettier 3 + Vitest 3 + husky + lint-staged
- CI：GitHub Actions（`.github/workflows/ci.yml`）

## 2. 本地环境

```bash
npm install          # 安装依赖（含 devDependencies 中的质量工具）
npm run dev          # 启动前端开发服务器
npm run tauri dev    # 启动完整桌面应用（需 Rust 工具链）
```

Node 版本建议 ≥ 20。

## 3. 必跑脚本（提交前 / CI 同款）

| 命令                   | 作用                         |
| ---------------------- | ---------------------------- |
| `npm run lint`         | ESLint 静态检查              |
| `npm run format`       | Prettier 格式化全量文件      |
| `npm run format:check` | 仅检查格式是否达标（CI 用）  |
| `npm run typecheck`    | `tsc --noEmit` 类型检查      |
| `npm run test`         | Vitest 跑单测                |
| `npm run build`        | `tsc && vite build` 生产构建 |

> 首次拉取代码后建议先跑一次 `npm run format`，把历史文件统一到团队格式基线，单独提交该次"格式基线"改动。

## 4. 提交流程

1. 从 `main` 切功能分支：`feat/xxx`、`fix/xxx`
2. 开发过程中：`npm run lint`、`npm run test` 随时跑
3. 提交前：`npm run format` + 自查 `docs/CODE_REVIEW_CHECKLIST.md`
4. `git commit` 会自动触发 husky → **lint-staged 对本次改动文件做 lint + format**
5. 提 PR，模板见 `.github/pull_request_template.md`
6. CI（lint / format / typecheck / test）全绿 + 至少 1 人评审通过，方可合并

## 5. 代码风格约定

- 缩进 2 空格，双引号，行宽 100，尾逗号 `all`（由 Prettier 强制，勿手改）
- 优先用 `type`/`interface` 显式标注函数签名与 props
- 禁止裸 `.catch(() => {})` 吞错；用户可感知失败要 toast
- 纯逻辑（工具函数、状态计算）从 UI 组件中抽离，便于单测
- 列表渲染用业务 id 作 `key`，不用数组下标

## 6. 评审期望

- 每个 PR 至少 1 名团队成员评审
- 评审对照 `docs/CODE_REVIEW_CHECKLIST.md` 逐条过
- 评审意见要具体（指出文件 + 行 + 建议改法），不只用"优化一下"这类模糊表述
