import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { listen } from "@tauri-apps/api/event";
import {
  applyMode,
  getStoredMode,
  resolveMode,
  watchSystemTheme,
  type ResolvedTheme,
} from "./theme";
import {
  getItems,
  getGroups,
  getImageData,
  deleteItem,
  updateItem,
  copyItem,
  pasteItem,
  hideMainWindow,
  getSettings,
  saveSettings,
  createGroup,
  updateGroup,
  deleteGroup,
  type GetItemsOpts,
} from "./api";
import type { ClipboardItem, Group, Settings, ThemeMode } from "./types";
import "./App.css";

const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const GROUP_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#64748b",
];

function fmtTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 子序列模糊匹配 */
function fuzzyMatch(text: string, q: string): boolean {
  if (!q) return true;
  const t = text.toLowerCase();
  const query = q.toLowerCase();
  let i = 0;
  for (const ch of t) {
    if (ch === query[i]) i++;
    if (i === query.length) return true;
  }
  return false;
}

function ImageThumb({ id }: { id: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getImageData(id)
      .then((d) => {
        if (alive) setSrc(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return <div className="thumb">{src ? <img src={src} alt="" /> : "⏳"}</div>;
}

/** 顶层 useEffect 事件监听 */
function App() {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    auto_clean_days: 30,
  });
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<"fav" | "all">("fav");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editItem, setEditItem] = useState<ClipboardItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 应用主题
  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  // 跟随系统时监听系统切换
  useEffect(() => {
    if (mode !== "system") return;
    return watchSystemTheme((t: ResolvedTheme) => {
      document.documentElement.setAttribute("data-theme", t);
    });
  }, [mode]);

  const refresh = useCallback(async () => {
    try {
      const opts: GetItemsOpts = { limit: 500 };
      if (tab === "fav") opts.favorite = 1;
      if (groupFilter != null) opts.groupId = groupFilter;
      const [it, gr] = await Promise.all([getItems(opts), getGroups()]);
      setItems(it);
      setGroups(gr);
    } catch (e) {
      console.error(e);
    }
  }, [tab, groupFilter]);

  // 初始化：加载设置 + 首次刷新
  useEffect(() => {
    if (!isTauriEnv) return;
    getSettings()
      .then((s) => {
        setSettings(s);
        setMode(s.theme as ThemeMode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 实时接收剪贴板监听推送
  useEffect(() => {
    const un = listen<ClipboardItem>("clipboard-new", (e) => {
      const it = e.payload;
      setItems((prev) => [it, ...prev.filter((i) => i.id !== it.id)]);
    });
    return () => {
      un.then((u) => u());
    };
  }, []);

  // 浮层行为：呼出时聚焦搜索框；失焦时自动隐藏窗口
  useEffect(() => {
    if (!isTauriEnv) return;
    const offShow = listen("palette-show", () => {
      setSearch("");
      setSelected(0);
      setTimeout(() => searchRef.current?.focus(), 30);
    });
    const offBlur = listen("tauri://blur", () => {
      void hideMainWindow();
    });
    let unShow: (() => void) | undefined;
    let unBlur: (() => void) | undefined;
    Promise.all([offShow, offBlur]).then(([a, b]) => {
      unShow = a;
      unBlur = b;
    });
    return () => {
      unShow?.();
      unBlur?.();
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  const onPaste = async (it: ClipboardItem) => {
    try {
      await pasteItem(it.id);
    } catch (e) {
      console.error(e);
      showToast("粘贴失败：请授权辅助功能");
    }
  };

  const onCopy = async (it: ClipboardItem) => {
    try {
      await copyItem(it.id);
      showToast("已复制");
    } catch (e) {
      console.error(e);
      showToast("复制失败");
    }
  };

  const onToggleFav = async (it: ClipboardItem) => {
    await updateItem(it.id, { favorite: it.favorite ? 0 : 1 });
    setItems((prev) =>
      prev.map((i) => (i.id === it.id ? { ...i, favorite: i.favorite ? 0 : 1 } : i)),
    );
  };

  const onDelete = async (id: number) => {
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const openSearch = () => {
    searchRef.current?.focus();
  };

  const openEdit = (it: ClipboardItem) => {
    setEditItem(it);
    setEditName(it.name || it.content || "");
    setEditGroup(it.group_id);
  };

  const saveEdit = async () => {
    if (!editItem) return;
    await updateItem(editItem.id, {
      name: editName.trim() || null,
      groupId: editGroup,
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === editItem.id ? { ...i, name: editName.trim() || null, group_id: editGroup } : i,
      ),
    );
    setEditItem(null);
  };

  const onAddGroup = async () => {
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
    await createGroup("新分组", color);
    const gr = await getGroups();
    setGroups(gr);
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return items;
    return items.filter((i) => fuzzyMatch(i.content || "", q) || fuzzyMatch(i.name || "", q));
  }, [items, search]);

  useEffect(() => {
    setSelected((s) => (filtered.length === 0 ? 0 : Math.min(s, filtered.length - 1)));
  }, [filtered]);

  useEffect(() => {
    itemRefs.current[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected, filtered]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[selected];
      if (it) onPaste(it);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (settingsOpen) {
        setSettingsOpen(false);
      } else if (editItem) {
        setEditItem(null);
      } else if (isTauriEnv) {
        void hideMainWindow();
      }
    }
  };

  const groupName = (id: number | null) =>
    id == null ? null : (groups.find((g) => g.id === id)?.name ?? null);
  const groupColor = (id: number | null) =>
    id == null ? null : (groups.find((g) => g.id === id)?.color ?? null);

  const setThemeMode = (m: ThemeMode) => {
    setMode(m);
    setSettings((s) => ({ ...s, theme: m }));
    saveSettings({ theme: m }).catch(() => {});
  };

  const setCleanDays = (d: number) => {
    setSettings((s) => ({ ...s, auto_clean_days: d }));
    saveSettings({ auto_clean_days: d }).catch(() => {});
  };

  return (
    <div className="app" onKeyDown={onKeyDown}>
      <header className="header">
        <div className="brand">PinPaste</div>
        <input
          ref={searchRef}
          className="search"
          placeholder={tab === "fav" ? "搜索收藏…" : "搜索剪贴板…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="icon-btn" title="搜索" onClick={openSearch}>
          🔍
        </button>
        <button
          className="icon-btn"
          title="切换亮色 / 暗色"
          onClick={() => setMode((t) => (resolveMode(t) === "dark" ? "light" : "dark"))}
        >
          {resolveMode(mode) === "dark" ? "🌙" : "☀️"}
        </button>
        <button className="icon-btn" title="设置" onClick={() => setSettingsOpen(true)}>
          ⚙️
        </button>
      </header>

      <div className="tabs">
        <button className={`tab${tab === "fav" ? " active" : ""}`} onClick={() => setTab("fav")}>
          ★ 收藏
        </button>
        <button className={`tab${tab === "all" ? " active" : ""}`} onClick={() => setTab("all")}>
          自动剪切
        </button>
      </div>

      {groups.length > 0 && (
        <div className="chips">
          <button
            className={`chip${groupFilter == null ? " active" : ""}`}
            onClick={() => setGroupFilter(null)}
          >
            全部
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              className={`chip${groupFilter === g.id ? " active" : ""}`}
              onClick={() => setGroupFilter(g.id)}
              style={groupFilter === g.id ? { borderColor: g.color, color: g.color } : undefined}
            >
              <span className="dot" style={{ background: g.color }} />
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="list">
        {filtered.length === 0 && (
          <div className="empty">{tab === "fav" ? "还没有收藏的内容" : "暂无剪贴板记录"}</div>
        )}
        {filtered.map((it, i) => (
          <div
            key={it.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={`item${selected === i ? " selected" : ""}`}
            onClick={() => onPaste(it)}
          >
            {it.item_type === "image" ? (
              <ImageThumb id={it.id} />
            ) : (
              <div className="thumb text-thumb">📄</div>
            )}
            <div className="item-body">
              <div className="item-text">
                {it.name || it.content || (it.item_type === "image" ? "[图片]" : "[内容]")}
              </div>
              <div className="item-meta">
                <span>{it.app_source || "未知来源"}</span>
                {groupName(it.group_id) && (
                  <>
                    <span>·</span>
                    <span style={{ color: groupColor(it.group_id) || undefined }}>
                      {groupName(it.group_id)}
                    </span>
                  </>
                )}
                <span>·</span>
                <span>{fmtTime(it.created_at)}</span>
                {it.favorite ? <span className="star">★</span> : null}
              </div>
            </div>
            <div className="item-actions">
              <button
                className="icon-btn"
                title="仅复制"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(it);
                }}
              >
                📋
              </button>
              <button
                className="icon-btn"
                title="收藏"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFav(it);
                }}
              >
                {it.favorite ? "★" : "☆"}
              </button>
              <button
                className="icon-btn"
                title="编辑 / 分组"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(it);
                }}
              >
                ✎
              </button>
              <button
                className="icon-btn danger"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(it.id);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}

      {/* 设置面板 */}
      {settingsOpen && (
        <div className="overlay" onClick={() => setSettingsOpen(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <span>设置</span>
              <button className="icon-btn" onClick={() => setSettingsOpen(false)}>
                ✕
              </button>
            </div>

            <div className="field">
              <label>主题</label>
              <div className="segmented">
                {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
                  <button
                    key={m}
                    className={mode === m ? "active" : ""}
                    onClick={() => setThemeMode(m)}
                  >
                    {m === "system" ? "跟随系统" : m === "light" ? "亮色" : "暗色"}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>自动清理剪贴板</label>
              <div className="segmented">
                {[
                  { d: 0, t: "关闭" },
                  { d: 1, t: "1 天" },
                  { d: 7, t: "7 天" },
                  { d: 30, t: "30 天" },
                ].map((o) => (
                  <button
                    key={o.d}
                    className={settings.auto_clean_days === o.d ? "active" : ""}
                    onClick={() => setCleanDays(o.d)}
                  >
                    {o.t}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>分组管理</label>
              <div className="group-list">
                {groups.map((g) => (
                  <div className="group-row" key={g.id}>
                    <input
                      type="color"
                      className="color-input"
                      value={g.color}
                      onChange={(e) => updateGroup(g.id, { color: e.target.value }).catch(() => {})}
                    />
                    <input
                      className="group-name"
                      defaultValue={g.name}
                      onBlur={(e) => updateGroup(g.id, { name: e.target.value }).catch(() => {})}
                    />
                    <button
                      className="icon-btn danger"
                      title="删除分组"
                      onClick={async () => {
                        await deleteGroup(g.id);
                        setGroups(await getGroups());
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button className="add-group" onClick={onAddGroup}>
                  + 新建分组
                </button>
              </div>
            </div>

            <div className="panel-tip">
              快捷键：Cmd+Shift+V 呼出 / 隐藏 · 点击托盘或 Dock 图标也可显示
            </div>
          </div>
        </div>
      )}

      {/* 条目编辑弹窗 */}
      {editItem && (
        <div className="overlay" onClick={() => setEditItem(null)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <span>编辑条目</span>
              <button className="icon-btn" onClick={() => setEditItem(null)}>
                ✕
              </button>
            </div>
            <div className="field">
              <label>名称</label>
              <input
                className="text-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="留空则显示原文"
              />
            </div>
            <div className="field">
              <label>分组</label>
              <select
                className="text-input"
                value={editGroup ?? ""}
                onChange={(e) =>
                  setEditGroup(e.target.value === "" ? null : Number(e.target.value))
                }
              >
                <option value="">无分组</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="panel-actions">
              <button className="btn" onClick={() => setEditItem(null)}>
                取消
              </button>
              <button className="btn primary" onClick={saveEdit}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
