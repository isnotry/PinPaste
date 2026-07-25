import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { applyMode, getStoredMode, watchSystemTheme, type ResolvedTheme } from "./theme";
import {
  getSettings,
  saveSettings,
  pasteItem,
  hideMainWindow,
  getActiveApp,
  updateGroup,
  togglePin,
  copyItem,
  ApiError,
} from "./api";
import { useClipboardData } from "./hooks/useClipboardData";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { useAppIcon } from "./hooks/useAppIcon";
import { ItemList } from "./components/ItemList";
import { SettingsPanel } from "./components/SettingsPanel";
import { EditDialog } from "./components/EditDialog";
import { searchMatch } from "./utils";
import type { ClipboardItem, Group, Settings, ThemeMode } from "./types";
import "./App.css";

const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export default function App() {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const [settings, setSettings] = useState<Settings>({ theme: "system", auto_clean_days: 30 });
  const [tab, setTab] = useState<"fav" | "all">("fav");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [appFilter, setAppFilter] = useState<string | null>(null);
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  const currentAppIcon = useAppIcon(currentApp);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editItem, setEditItem] = useState<ClipboardItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editGroup, setEditGroup] = useState<number | null>(null);
  const [pinned, setPinned] = useState(true);
  const pinnedRef = useRef(true);
  const showGuardRef = useRef(0); // show 后短时间忽略 blur
  const handleTogglePin = useCallback(async () => {
    try {
      const next = await togglePin();
      pinnedRef.current = next;
      setPinned(next);
    } catch (e) {
      console.error("切换置顶失败", e);
    }
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef(new Map<number, HTMLDivElement>());

  const { items, groups, appSources, toggleFav, remove, saveItem, addGroup, removeGroup } =
    useClipboardData(tab, groupFilter, appFilter);

  const registerRef = useCallback((id: number, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    return watchSystemTheme((t: ResolvedTheme) => {
      document.documentElement.setAttribute("data-theme", t);
    });
  }, [mode]);

  useEffect(() => {
    if (!isTauriEnv) return;
    getSettings()
      .then((s) => {
        setSettings(s);
        setMode(s.theme);
      })
      .catch((e) => console.error("加载设置失败", e));
  }, []);

  useEffect(() => {
    if (!isTauriEnv) return;
    const offShow = listen("palette-show", () => {
      showGuardRef.current = Date.now() + 300; // 300ms 内忽略 blur
      setSearch("");
      setSelectedId(null);
      getActiveApp()
        .then((a) => setCurrentApp(a))
        .catch((e) => console.error("获取当前 App 失败", e));
      setTimeout(() => searchRef.current?.focus(), 30);
    });
    const offBlur = listen("tauri://blur", () => {
      if (pinnedRef.current) return; // 置顶时失焦不隐藏
      if (Date.now() < showGuardRef.current) return; // show 后 300ms 内忽略 blur
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

  const handleCopy = useCallback(
    (id: number) => {
      void copyItem(id)
        .then(() => showToast("已复制"))
        .catch((e) => console.error("复制失败", e));
    },
    [showToast],
  );

  const openEdit = useCallback((it: ClipboardItem) => {
    setEditItem(it);
    setEditContent(it.content || "");
    setEditGroup(it.group_id);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editItem) return;
    const id = editItem.id;
    const groupId = editGroup;
    const content = editItem.item_type === "image" ? null : editContent;
    saveItem(id, null, groupId, content)
      .then(() => setEditItem(null))
      .catch((e) => {
        console.error(e);
        showToast("保存失败，请重试");
      });
  }, [editItem, editContent, editGroup, saveItem, showToast]);

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
    return items.filter((i) => searchMatch(`${i.content ?? ""}\n${i.name ?? ""}`, q));
  }, [items, search]);

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
    onBackspace: (it) => onDelete(it.id),
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
          onKeyDown={(e) => {
            if (e.key === "Backspace" && search === "") {
              e.preventDefault();
              e.stopPropagation();
              const it = filtered.find((i) => i.id === selectedId);
              if (it) onDelete(it.id);
            }
          }}
        />
        <button
          className={`icon-btn${pinned ? " active" : ""}`}
          title={pinned ? "取消钉住" : "钉在最前"}
          onClick={handleTogglePin}
        >
          📌
        </button>
        <button className="icon-btn" title="设置" onClick={() => setSettingsOpen(true)}>
          ⚙️
        </button>
      </header>

      <div className="tabs">
        <button
          className={`tab${tab === "fav" ? " active" : ""}`}
          onClick={() => {
            setTab("fav");
            setAppFilter(null);
          }}
        >
          ★ 收藏
        </button>
        <button
          className={`tab${tab === "all" ? " active" : ""}`}
          onClick={() => {
            setTab("all");
            setGroupFilter(null);
          }}
        >
          自动剪切
        </button>
      </div>

      <div className="main-area">
        <aside className="sidebar">
          {tab === "fav" ? (
            <>
              <button
                className={`sidebar-item${groupFilter == null ? " active" : ""}`}
                onClick={() => setGroupFilter(null)}
              >
                全部
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  className={`sidebar-item${groupFilter === g.id ? " active" : ""}`}
                  onClick={() => setGroupFilter(g.id)}
                  style={
                    groupFilter === g.id
                      ? { borderLeftColor: g.color, color: g.color }
                      : { borderLeftColor: "transparent" }
                  }
                >
                  <span className="dot" style={{ background: g.color }} />
                  <span className="sidebar-label">{g.name}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                className={`sidebar-item${appFilter == null ? " active" : ""}`}
                onClick={() => setAppFilter(null)}
              >
                全部来源
              </button>
              {currentApp && (
                <button
                  className={`sidebar-item${appFilter === currentApp ? " active" : ""}`}
                  onClick={() => setAppFilter(currentApp)}
                  style={
                    appFilter === currentApp
                      ? { borderLeftColor: "var(--accent)" }
                      : { borderLeftColor: "transparent" }
                  }
                >
                  <span className="sidebar-label">
                    {currentAppIcon && (
                      <img
                        className="sidebar-app-icon"
                        src={currentAppIcon}
                        alt=""
                        width={14}
                        height={14}
                      />
                    )}
                    当前 · {currentApp}
                  </span>
                </button>
              )}
              {appSources
                .filter((a) => a !== currentApp)
                .map((a) => (
                  <button
                    key={a}
                    className={`sidebar-item${appFilter === a ? " active" : ""}`}
                    onClick={() => setAppFilter(a)}
                    style={
                      appFilter === a
                        ? { borderLeftColor: "var(--accent)" }
                        : { borderLeftColor: "transparent" }
                    }
                  >
                    <span className="sidebar-label">{a}</span>
                  </button>
                ))}
            </>
          )}
        </aside>

        <ItemList
          items={filtered}
          selectedId={selectedId}
          registerRef={registerRef}
          onSelect={setSelectedId}
          onEdit={openEdit}
          onCopy={handleCopy}
          onToggleFav={onToggleFav}
          onDelete={onDelete}
          groupName={groupName}
          emptyText={tab === "fav" ? "还没有收藏的内容" : "暂无剪贴板记录"}
          tab={tab}
        />
      </div>

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
        editContent={editContent}
        editGroup={editGroup}
        groups={groups}
        onContentChange={setEditContent}
        onGroupChange={setEditGroup}
        onSave={saveEdit}
        onClose={() => setEditItem(null)}
        onDelete={(id) => {
          onDelete(id);
          setEditItem(null);
        }}
      />
    </div>
  );
}
