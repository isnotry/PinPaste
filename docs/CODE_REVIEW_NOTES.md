# 代码评审示范：PinPaste 现有 `src` 复盘（2026-07-14）

> 这是一次"带头做评审"的样例，目的是让团队看到**资深开发关注什么、怎么提意见**。
> 配合 `docs/CODE_REVIEW_CHECKLIST.md` 使用。所有定位基于当前 `src/` 实际代码。
> 分级：**P0** = 影响质量/健壮性，应优先改；**P1** = 影响正确性/可维护性；**P2** = 一致性/可读性改进。

## 总体评价

功能完整、模块分层基本合理（`api.ts` 数据访问 / `types.ts` 类型 / `theme.ts` 纯逻辑 / `App.tsx` UI）。
短板集中在两处：**完全没有工程化护栏**（无 lint / 无测试 / 无 CI），以及 **`App.tsx` 是 ~514 行的"上帝组件" + 错误处理粗放**。
这正是团队从"能跑"迈向"可维护、可协作、质量可控"要补的课。

---

## P0 — 优先改

### 1. 错误处理静默吞错（多处）

裸 `.catch(() => {})` 会在生产环境让问题完全不可见。

- `src/App.tsx:144` `getSettings().then(...).catch(() => {})`
- `src/App.tsx:303` `saveSettings({ theme: m }).catch(() => {})`
- `src/App.tsx:308` `saveSettings({ auto_clean_days: d }).catch(() => {})`
- `src/App.tsx:528,534` `updateGroup(...).catch(() => {})`
- `src/App.tsx:85`（`ImageThumb`）`.catch(() => {})`

**改法**：至少打日志 + 给用户可见反馈；更彻底的是在 `api.ts` 统一封装错误（如 `ApiError`），把"成功/失败"语义上提到调用层。

```ts
// api.ts 统一封装（示意）
export async function saveSettings(patch: Partial<Settings>) {
  try {
    return await invoke("save_settings", patch);
  } catch (e) {
    throw new Error(`保存设置失败: ${String(e)}`);
  }
}
```

### 2. `api.ts` 类型不严谨（用 `string` 绕过联合类型）

- `saveSettings(patch: Partial<{ theme: string; auto_clean_days: number }>)` —— `theme` 应是 `ThemeMode`，不是 `string`。
- `updateItem` 的 `patch` 用内联类型，未复用 `types.ts`。

**改法**：复用既有类型，让编译器替你把关系。

```ts
export const saveSettings = (patch: Partial<Pick<Settings, "theme" | "auto_clean_days">>) =>
  invoke("save_settings", patch);

export const updateItem = (
  id: number,
  patch: Partial<Pick<ClipboardItem, "name" | "favorite" | "group_id">>,
) => invoke("update_item", { id, ...patch });
```

### 3. `App.tsx` 巨型组件（22 个 `useState`，514 行）

单一组件承载数据加载、键盘导航、列表渲染、设置面板、编辑弹窗，**难测试、难复用、难 review**。

**改法（渐进，不一次大改）**：

- 抽 `useClipboardData()`：管理 items / groups / refresh / 实时监听。
- 抽 `useKeyboardNav(filtered, onEnter)`：方向键 + Enter + Esc 逻辑。
- 拆组件：`ItemList` / `ItemRow` / `SettingsPanel` / `EditDialog`。
- 收益：每个单元可单测；新人改动影响面小。

---

## P1 — 影响正确性 / 健壮性

### 4. 列表用数组下标作"选中"与 `ref` 索引（脆弱）

`selected` 是下标，`itemRefs.current[i]` 也是下标；删除/过滤后下标漂移，只能靠 `useEffect`（264–270 行）手动修正，容易出 bug。

**改法**：用业务 `id` 驱动。

```ts
const [selectedId, setSelectedId] = useState<number | null>(null);
const itemRefs = useRef(new Map<number, HTMLDivElement>());
// ref 回调：ref={(el) => { if (el) itemRefs.current.set(it.id, el); else itemRefs.current.delete(it.id); }}
// 选中用 id：onClick={() => setSelectedId(it.id)}
```

### 5. 多余的 `as` 类型断言

`src/App.tsx:142` `setMode(s.theme as ThemeMode)` —— `Settings.theme` 已是 `ThemeMode`，`as` 暴露出类型链路上的不信任。应从根源收紧（见 P0-2），而不是用断言盖住。

### 6. 图片加载失败无终态

`ImageThumb` 加载失败 → `catch` 后 `src` 仍为 `null` → 永远显示 `⏳`，用户无法区分"加载中"和"加载失败"。

**改法**：区分 loading / error 状态：

```tsx
const [state, setState] = useState<"loading" | "ok" | "error">("loading");
// 失败显示占位图标而非无限 loading
```

---

## P2 — 一致性 / 可读性

### 7. 可测试化示范：`fuzzyMatch` / `fmtTime` 应抽离并补测

二者是纯函数，却内联在 `App.tsx` 里无法单测。建议抽到 `src/utils.ts` 导出，并补 `src/utils.test.ts`（与已写的 `src/theme.test.ts` 形成测试基线）。

### 8. `GROUP_COLORS` 硬编码数组

当前可接受；若后续可调，建议提到 `src/config.ts` 或跟随分组数据下发的配色。

### 9. 注释质量

整体不错（中文清晰、关键逻辑有说明）。保持这个习惯，评审时也以此为标准。

---

## 作为"评审样例"的示范价值

这次复盘集中体现了评审要看的几条：

- **错误处理是否静默吞错**（P0-1）——最容易被忽略、危害最大的点
- **类型是否用 `any`/`string`/`as` 绕过检查**（P0-2、P1-5）
- **巨型组件是否该拆、纯逻辑是否可单测**（P0-3、P2-7）
- **下标索引是否导致脆弱逻辑**（P1-4）

对照 `docs/CODE_REVIEW_CHECKLIST.md` 第 2/3/4/5 节，就是这次的具体体现。
