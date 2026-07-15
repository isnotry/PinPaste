import type { ClipboardItem } from "../types";
import { ImageThumb } from "./ImageThumb";
import { fmtTime } from "../utils";

interface ItemRowProps {
  item: ClipboardItem;
  selected: boolean;
  registerRef: (id: number, el: HTMLDivElement | null) => void;
  onSelect: (id: number) => void;
  onPaste: (it: ClipboardItem) => void;
  onCopy: (it: ClipboardItem) => void;
  onToggleFav: (it: ClipboardItem) => void;
  onEdit: (it: ClipboardItem) => void;
  onDelete: (id: number) => void;
  groupName: (id: number | null) => string | null;
  groupColor: (id: number | null) => string | null;
}

export function ItemRow(props: ItemRowProps) {
  const { item: it, selected } = props;
  const gn = props.groupName(it.group_id);
  const gc = props.groupColor(it.group_id);
  return (
    <div
      ref={(el) => props.registerRef(it.id, el)}
      className={`item${selected ? " selected" : ""}`}
      onClick={() => props.onSelect(it.id)}
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
          {gn && (
            <>
              <span>·</span>
              <span style={{ color: gc || undefined }}>{gn}</span>
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
            props.onCopy(it);
          }}
        >
          📋
        </button>
        <button
          className="icon-btn"
          title="收藏"
          onClick={(e) => {
            e.stopPropagation();
            props.onToggleFav(it);
          }}
        >
          {it.favorite ? "★" : "☆"}
        </button>
        <button
          className="icon-btn"
          title="编辑 / 分组"
          onClick={(e) => {
            e.stopPropagation();
            props.onEdit(it);
          }}
        >
          ✎
        </button>
        <button
          className="icon-btn danger"
          title="删除"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete(it.id);
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
