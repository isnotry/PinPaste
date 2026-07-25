import type { ClipboardItem, Group } from "../types";
import type { TFunc } from "../i18n";

interface EditDialogProps {
  item: ClipboardItem | null;
  editContent: string;
  editGroup: number | null;
  groups: Group[];
  t: TFunc;
  onContentChange: (v: string) => void;
  onGroupChange: (v: number | null) => void;
  onSave: () => void;
  onClose: () => void;
  onDelete: (id: number) => void;
}

export function EditDialog(props: EditDialogProps) {
  if (!props.item) return null;
  const it = props.item;
  const isImage = it.item_type === "image";
  const { t } = props;

  return (
    <div
      className="overlay"
      onClick={props.onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") props.onClose();
        e.stopPropagation();
      }}
    >
      <div className="panel edit-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span>{t("edit_title")}</span>
          <button className="icon-btn" onClick={props.onClose}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>{t("edit_content")}</label>
          {isImage ? (
            <div className="edit-content-preview">
              <span className="dim">[{t("item_image")}]</span>
            </div>
          ) : (
            <textarea
              className="edit-textarea"
              value={props.editContent}
              onChange={(e) => props.onContentChange(e.target.value)}
              autoFocus
              rows={6}
            />
          )}
        </div>

        <div className="field">
          <label>{t("edit_group")}</label>
          <select
            className="text-input"
            value={props.editGroup ?? ""}
            onChange={(e) =>
              props.onGroupChange(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">{t("edit_no_group")}</option>
            {props.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="panel-actions">
          <button className="btn danger-btn" onClick={() => props.onDelete(it.id)}>
            {t("action_delete")}
          </button>
          <div className="panel-actions-right">
            <button className="btn" onClick={props.onClose}>
              {t("edit_cancel")}
            </button>
            <button className="btn primary" onClick={props.onSave}>
              {t("edit_save")}
            </button>
          </div>
        </div>

        <div className="panel-tip">{t("edit_hint")}</div>
      </div>
    </div>
  );
}
