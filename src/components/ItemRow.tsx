import { useState, useEffect, useCallback } from "react";
import type { ClipboardItem } from "../types";
import { ImageThumb } from "./ImageThumb";
import { ImagePreview } from "./ImagePreview";
import { fmtTime } from "../utils";

interface ItemRowProps {
  item: ClipboardItem;
  selected: boolean;
  registerRef: (id: number, el: HTMLDivElement | null) => void;
  onSelect: (id: number) => void;
  onEdit: (it: ClipboardItem) => void;
  onCopy: (id: number) => void;
  onToggleFav: (it: ClipboardItem) => void;
  onDelete: (id: number) => void;
  groupName: (id: number | null) => string | null;
  tab: "fav" | "all";
}

export function ItemRow(props: ItemRowProps) {
  const { item: it, selected } = props;
  const gn = props.groupName(it.group_id);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const closeMenu = useCallback(() => setMenuPos(null), []);

  useEffect(() => {
    if (!menuPos) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-ctx-menu]")) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuPos, closeMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onCopy(it.id);
  };

  const handleEdit = () => {
    closeMenu();
    props.onEdit(it);
  };

  return (
    <>
      <div
        ref={(el) => props.registerRef(it.id, el)}
        className={`item${selected ? " selected" : ""}`}
        onClick={() => props.onSelect(it.id)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <div className="item-main">
          <div className="item-content-row">
            {it.item_type === "image" ? (
              <>
                <ImageThumb id={it.id} onPreview={setPreviewSrc} />
                <span className="item-text">{it.name || "[图片]"}</span>
              </>
            ) : (
              <div className="item-text">{it.name || it.content || "[内容]"}</div>
            )}
          </div>
          <div className="item-meta">
            <span className="meta-time">{fmtTime(it.created_at)}</span>
            <span className="meta-sep">·</span>
            {props.tab === "fav" ? (
              <span className="meta-source" title={gn || "未分组"}>
                {gn || "未分组"}
              </span>
            ) : (
              <span className="meta-source" title={it.app_source || "未知来源"}>
                {it.app_source || "未知"}
              </span>
            )}
          </div>
        </div>

        <button
          className="fav-btn"
          title={it.favorite ? "取消收藏" : "收藏"}
          onClick={(e) => {
            e.stopPropagation();
            props.onToggleFav(it);
          }}
        >
          {it.favorite ? "★" : "☆"}
        </button>
      </div>

      <ImagePreview src={previewSrc} onClose={() => setPreviewSrc(null)} />

      {menuPos && (
        <div className="ctx-menu" data-ctx-menu style={{ left: menuPos.x, top: menuPos.y }}>
          <button className="ctx-menu-item" onClick={handleEdit}>
            编辑
          </button>
        </div>
      )}
    </>
  );
}
