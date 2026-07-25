# Changelog

## v0.4.0 (2026-07-26)

### 新增

- **国际化系统**：中/英文双语切换，60+ 翻译条目，浏览器语言自动检测
  - `src/i18n.ts`：翻译字典与 `createT()` 工厂函数
  - `src/hooks/useLang.ts`：语言管理 hook，localStorage 持久化
  - 设置面板新增语言切换 segmented 控件
  - 后端 `settings` 表新增 `lang` 字段

- **卡片网格布局**：窗口拉宽时自动切换为多列卡片平铺
  - `@media` query 断点：780px(3列) / 1100px(4列) / 1420px(5列)
  - 卡片模式：内容 4 行、收藏按钮右上角 hover 显示、图片缩略图放大

### 优化

- **Tab 切换性能**：`refresh` 从串行 3 请求改为 `Promise.all` 并行，用 `getAppSources()` SQL DISTINCT 替代拉全部条目再前端提取
- **置顶状态持久化**：`settings` 表新增 `pinned` 字段，重启后恢复

### 修复

- **ImageThumb 测试**：`<img alt="">` 导致 `getByRole("img")` 失败，改用 `findByRole` + `alt="clipboard image"`
- **窗口隐藏 bug**：blur → hideMainWindow 在 show → focus → blur 序列中触发，加 300ms guard + pinnedRef 拦截

### 移除

- **App 图标功能**：四级查找策略（运行中 App → fullPathForApplication → 中英映射 → 文件系统直搜）不可靠，整体移除
  - 删除 `useAppIcon` hook、后端 `app_icon_base64`、`get_app_icon`/`get_app_icons` 命令
  - 清理 `Cargo.toml`：移除 `image` tiff feature 和 `objc2-app-kit` NSImage feature

### 视觉

- **列表项排版**：从左来源灰底 + 右内容，改为上行内容 + 下行 `时间 · 来源`
- **侧栏**：去掉 emoji 图标，改为「当前 · XX」格式
- **选中项**：去掉 `inset box-shadow`，只保留 `border`

## v0.3.0 (2026-07-22)

### 新增

- **App 来源绑定**：后端通过 `objc2-app-kit` 获取前台 App 名称，填充 `app_source` 字段
- **双击复制**：双击条目复制内容到剪贴板，过滤 PinPaste 自身来源
- **右键编辑菜单**：右键条目弹出菜单，选择「编辑」进入弹窗
- **搜索替换**：`fuzzyMatch` → `searchMatch`（大小写不敏感子串 + 空格分词 AND）
- **收藏机制重写**：`favorite_item` 改为 UPDATE（不再复制记录），新增 `unfavorite_item`
- **删除引用计数**：`delete_item` 检查 image_path 引用计数后删除物理文件
- **窗口置顶**：`toggle_pin` 命令
- **视觉设计系统 v2**：设计令牌（颜色/圆角/间距/阴影/动效）、iOS 风格 segmented 控件、hover 微阴影、弹窗入场动画、毛玻璃遮罩
- **搜索实时化**：移除搜索按钮，改为输入即时过滤
- **收藏保护**：`trim_history` 加 `WHERE favorite = 0`，收藏内容不受自动清理影响

### 修复

- **吸附功能回滚**：edge dock 功能导致窗口隐藏 bug，完全移除
- **blur guard**：移除 `show_main` 中的 `set_always_on_top`；blur 监听加 300ms guard

## v0.2.0 (2026-07-16)

代码评审 P0/P1/P2 逐项整改：

- **P0-1**：错误处理统一封装（`ApiError` + `call()` 函数）
- **P0-2**：类型收紧（`saveSettings` 用 `Partial<Pick<...>>`）
- **P0-3**：拆分上帝组件（App.tsx 581→~330 行，拆出 5 个组件 + 2 个 hook）
- **P1-4**：选中状态从数组下标改为业务 id
- **P1-5**：移除断言
- **P1-6**：图片三态（loading/ok/error）
- **P2-7**：工具函数抽取 + 测试
- **P2-8**：配置外提

## v0.1.0 (2026-07-14)

工程基线建立：

- Git 仓库初始化
- ESLint 9 + Prettier 3 + Vitest 3
- husky + lint-staged 提交前门禁
- GitHub Actions CI
- 代码评审 Checklist + PR 模板
- 测试 7/7 通过
