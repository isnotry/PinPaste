import type { Group, Settings, ThemeMode } from "../types";

interface SettingsPanelProps {
  open: boolean;
  mode: ThemeMode;
  settings: Settings;
  groups: Group[];
  onClose: () => void;
  onThemeMode: (m: ThemeMode) => void;
  onCleanDays: (d: number) => void;
  onAddGroup: () => void;
  onUpdateGroup: (id: number, patch: Partial<Pick<Group, "name" | "color">>) => void;
  onDeleteGroup: (id: number) => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  if (!props.open) return null;
  return (
    <div className="overlay" onClick={props.onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span>设置</span>
          <button className="icon-btn" onClick={props.onClose}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>主题</label>
          <div className="segmented">
            {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
              <button
                key={m}
                className={props.mode === m ? "active" : ""}
                onClick={() => props.onThemeMode(m)}
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
                className={props.settings.auto_clean_days === o.d ? "active" : ""}
                onClick={() => props.onCleanDays(o.d)}
              >
                {o.t}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>分组管理</label>
          <div className="group-list">
            {props.groups.map((g) => (
              <div className="group-row" key={g.id}>
                <input
                  type="color"
                  className="color-input"
                  value={g.color}
                  onChange={(e) => props.onUpdateGroup(g.id, { color: e.target.value })}
                />
                <input
                  className="group-name"
                  defaultValue={g.name}
                  onBlur={(e) => props.onUpdateGroup(g.id, { name: e.target.value })}
                />
                <button
                  className="icon-btn danger"
                  title="删除分组"
                  onClick={() => props.onDeleteGroup(g.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="add-group" onClick={props.onAddGroup}>
              + 新建分组
            </button>
          </div>
        </div>

        <div className="panel-tip">
          快捷键：Cmd+Shift+V 呼出 / 隐藏 · 点击托盘或 Dock 图标也可显示
        </div>
      </div>
    </div>
  );
}
