import type { Group, Settings, ThemeMode, Lang } from "../types";
import { LANG_OPTIONS } from "../i18n";
import type { TFunc } from "../i18n";

interface SettingsPanelProps {
  open: boolean;
  mode: ThemeMode;
  settings: Settings;
  groups: Group[];
  t: TFunc;
  onClose: () => void;
  onThemeMode: (m: ThemeMode) => void;
  onCleanDays: (d: number) => void;
  onLangChange: (l: Lang) => void;
  onAddGroup: () => void;
  onUpdateGroup: (id: number, patch: Partial<Pick<Group, "name" | "color">>) => void;
  onDeleteGroup: (id: number) => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  if (!props.open) return null;
  const { t } = props;
  return (
    <div className="overlay" onClick={props.onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span>{t("settings_title")}</span>
          <button className="icon-btn" onClick={props.onClose}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>{t("settings_theme")}</label>
          <div className="segmented">
            {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
              <button
                key={m}
                className={props.mode === m ? "active" : ""}
                onClick={() => props.onThemeMode(m)}
              >
                {m === "system"
                  ? t("settings_theme_system")
                  : m === "light"
                    ? t("settings_theme_light")
                    : t("settings_theme_dark")}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t("settings_clean")}</label>
          <div className="segmented">
            {[
              { d: 0, label: t("settings_clean_off") },
              { d: 1, label: `1 ${t("settings_clean_days")}` },
              { d: 7, label: `7 ${t("settings_clean_days")}` },
              { d: 30, label: `30 ${t("settings_clean_days")}` },
            ].map((o) => (
              <button
                key={o.d}
                className={props.settings.auto_clean_days === o.d ? "active" : ""}
                onClick={() => props.onCleanDays(o.d)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t("settings_language")}</label>
          <div className="segmented">
            {LANG_OPTIONS.map((o) => (
              <button
                key={o.value}
                className={props.settings.lang === o.value ? "active" : ""}
                onClick={() => props.onLangChange(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t("edit_group")}</label>
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
                  title={t("action_delete")}
                  onClick={() => props.onDeleteGroup(g.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="add-group" onClick={props.onAddGroup}>
              + {t("edit_group")}
            </button>
          </div>
        </div>

        <div className="panel-tip">⌘+⇧+V · {t("action_close")}</div>

        <div className="panel-footer">
          <a
            className="repo-link"
            href="https://github.com/isnotry/PinPaste"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("repo_link")}
          </a>
        </div>
      </div>
    </div>
  );
}
