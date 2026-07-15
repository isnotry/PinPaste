import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  applyMode,
  getStoredMode,
  resolveMode,
  watchSystemTheme,
  type ResolvedTheme,
} from "./theme";
import {
  getSettings,
  saveSettings,
  copyItem,
  pasteItem,
  hideMainWindow,
  updateGroup,
  ApiError,
} from "./api";
import { useClipboardData } from "./hooks/useClipboardData";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { ItemList } from "./components/ItemList";
import { SettingsPanel } from "./components/SettingsPanel";
import { EditDialog } from "./components/EditDialog";
import { fuzzyMatch } from "./utils";
import type { ClipboardItem, Group, Settings, ThemeMode } from "./types";
import "./App.css";

const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export default function App() {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const [settings, setSettings] = useState<Settings>({ theme: "system", auto_clean_days: 30 });
  const [tab, setTab] = useState<"fav" | "all">("fav");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editItem, setEditItem] = useState<ClipboardItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef(new Map<number, HTMLDivElement>());

  const { items, groups, toggleFav, remove, saveItem, addGroup, removeGroup } = useClipboardData(
    tab,
    groupFilter,
  );

  const registerRef = useCallback((id: number, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  // 应用主题
  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  // 跟随系统主题
  useEffect(() => {
    if (mode !== "system") return;
    return watchSystemTheme((t: ResolvedTheme) => {
      document.documentElement.setAttribute("data-theme", t);
    });
  }, [mode]);

  // 初始化：加载设置。失败仅记录日志，使用默认设置兜底（不静默吞错）
  useEffect(() => {
    if (!isTauriEnv) return;
    getSettings()
      .then((s) => {
        setSettings(s);
        setMode(s.theme);
      })
      .catch((e) => console.error("加载设置失败", e));
  }, []);

  // 浮层行为：呼出时聚焦搜索框；失焦时自动隐藏窗口
  useEffect(() => {
    if (!isTauriEnv) return;
    const offShow = listen("palette-show", () => {
      setSearch("");
      setSelectedId(null);
      setTimeout(() => searchRef.current?.focus(), 30);
    });
    const offBlur = listen("tauri://blur", () => {
      void hideMainWindow().catch((e) => console.error("隐藏窗口失败", e));
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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const onPaste = useCallback(
    async (it: ClipboardItem) => {
      try {
        await pasteItem(it.id);
      } catch (e) {
        console.error(e);
        showToast(e instanceof ApiError ? e.message : "粘贴失败：请授权辅助功能");
      }
    },
    [showToast],
  );

  const onCopy = useCallback(
    async (it: ClipboardItem) => {
      try {
        await copyItem(it.id);
        showToast("已复制");
      } catch (e) {
        console.error(e);
        showToast(e instanceof ApiError ? e.message : "复制失败");
      }
    },
    [showToast],
  );

  const onToggleFav = useCallback(
    (it: ClipboardItem) => {
      toggleFav(it).catch((e) => {
        console.error(e);
        showToast("操作失败，请重试");
      });
    },
    [toggleFav, showToast],
  );

  const onDelete = useCallback(
    (id: number) => {
      remove(id).catch((e) => {
        console.error(e);
        showToast("删除失败，请重试");
      });
    },
    [remove, showToast],
  );

  const openEdit = useCallback((it: ClipboardItem) => {
    setEditItem(it);
    setEditName(it.name || it.content || "");
    setEditGroup(it.group_id);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editItem) return;
    const id = editItem.id;
    const name = editName.trim() || null;
    const groupId = editGroup;
    saveItem(id, name, groupId)
      .then(() => setEditItem(null))
      .catch((e) => {
        console.error(e);
        showToast("保存失败，请重试");
      });
  }, [editItem, editName, editGroup, saveItem, showToast]);

  const onAddGroup = useCallback(() => {
    addGroup().catch((e) => {
      console.error(e);
      showToast("新建分组失败");
    });
  }, [addGroup, showToast]);

  const onUpdateGroup = useCallback(
    (id: number, patch: Partial<Pick<Group, "name" | "color">>) => {
      updateGroup(id, patch).catch((e) => {
        console.error(e);
        showToast("更新分组失败");
      });
    },
    [showToast],
  );

  const onDeleteGroup = useCallback(
    (id: number) => {
      removeGroup(id).catch((e) => {
        console.error(e);
        showToast("删除分组失败");
      });
    },
    [removeGroup, showToast],
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return items;
    return items.filter((i) => fuzzyMatch(i.content || "", q) || fuzzyMatch(i.name || "", q));
  }, [items, search]);

  // 选中以业务 id 驱动：过滤后当前 id 失效则回退到第一条
  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!filtered.some((i) => i.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (selectedId == null) return;
    itemRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, filtered]);

  const groupName = useCallback(
    (id: number | null) => (id == null ? null : (groups.find((g) => g.id === id)?.name ?? null)),
    [groups],
  );
  const groupColor = useCallback(
    (id: number | null) => (id == null ? null : (groups.find((g) => g.id === id)?.color ?? null)),
    [groups],
  );

  const handleEscape = useCallback(() => {
    if (settingsOpen) setSettingsOpen(false);
    else if (editItem) setEditItem(null);
    else if (isTauriEnv) void hideMainWindow().catch((e) => console.error(e));
  }, [settingsOpen, editItem]);

  const onKeyDown = useKeyboardNav({
    filtered,
    selectedId,
    setSelectedId,
    onEnter: onPaste,
    onEscape: handleEscape,
  });

  const setThemeMode = useCallback(
    (m: ThemeMode) => {
      setMode(m);
      setSettings((s) => ({ ...s, theme: m }));
      saveSettings({ theme: m }).catch((e) => {
        console.error(e);
        showToast(e instanceof ApiError ? e.message : "保存设置失败");
      });
    },
    [showToast],
  );

  const setCleanDays = useCallback(
    (d: number) => {
      setSettings((s) => ({ ...s, auto_clean_days: d }));
      saveSettings({ auto_clean_days: d }).catch((e) => {
        console.error(e);
        showToast(e instanceof ApiError ? e.message : "保存设置失败");
      });
    },
    [showToast],
  );

  const openSearch = () => {
    searchRef.current?.focus();
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

      <ItemList
        items={filtered}
        selectedId={selectedId}
        registerRef={registerRef}
        onSelect={setSelectedId}
        onPaste={onPaste}
        onCopy={onCopy}
        onToggleFav={onToggleFav}
        onEdit={openEdit}
        onDelete={onDelete}
        groupName={groupName}
        groupColor={groupColor}
        emptyText={tab === "fav" ? "还没有收藏的内容" : "暂无剪贴板记录"}
      />

      {toast && <div className="toast">{toast}</div>}

      <SettingsPanel
        open={settingsOpen}
        mode={mode}
        settings={settings}
        groups={groups}
        onClose={() => setSettingsOpen(false)}
        onThemeMode={setThemeMode}
        onCleanDays={setCleanDays}
        onAddGroup={onAddGroup}
        onUpdateGroup={onUpdateGroup}
        onDeleteGroup={onDeleteGroup}
      />

      <EditDialog
        item={editItem}
        editName={editName}
        editGroup={editGroup}
        groups={groups}
        onNameChange={setEditName}
        onGroupChange={setEditGroup}
        onSave={saveEdit}
        onClose={() => setEditItem(null)}
      />
    </div>
  );
}
