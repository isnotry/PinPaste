import type { ClipboardItem, Group } from "../types";

interface EditDialogProps {
  item: ClipboardItem | null;
  editName: string;
  editGroup: number | null;
  groups: Group[];
  onNameChange: (v: string) => void;
  onGroupChange: (v: number | null) => void;
  onSave: () => void;
  onClose: () => void;
}

export function EditDialog(props: EditDialogProps) {
  if (!props.item) return null;
  return (
    <div className="overlay" onClick={props.onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span>编辑条目</span>
          <button className="icon-btn" onClick={props.onClose}>
            ✕
          </button>
        </div>
        <div className="field">
          <label>名称</label>
          <input
            className="text-input"
            value={props.editName}
            onChange={(e) => props.onNameChange(e.target.value)}
            placeholder="留空则显示原文"
          />
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
          <button className="btn" onClick={props.onClose}>
            取消
          </button>
          <button className="btn primary" onClick={props.onSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
