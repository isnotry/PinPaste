import type { ClipboardItem, Group } from "../types";

interface EditDialogProps {
  item: ClipboardItem | null;
  editContent: string;
  editGroup: number | null;
  groups: Group[];
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
          <span>编辑条目</span>
          <button className="icon-btn" onClick={props.onClose}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>内容</label>
          {isImage ? (
            <div className="edit-content-preview">
              <span className="dim">[图片不可编辑]</span>
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
          <label>分组</label>
          <select
            className="text-input"
            value={props.editGroup ?? ""}
            onChange={(e) =>
              props.onGroupChange(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">无分组</option>
            {props.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="panel-actions">
          <button className="btn danger-btn" onClick={() => props.onDelete(it.id)}>
            删除
          </button>
          <div className="panel-actions-right">
            <button className="btn" onClick={props.onClose}>
              取消
            </button>
            <button className="btn primary" onClick={props.onSave}>
              保存
            </button>
          </div>
        </div>

        <div className="panel-tip">双击列表条目可打开编辑 · Enter 粘贴 · Backspace 删除</div>
      </div>
    </div>
  );
}
