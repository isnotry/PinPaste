import type { ClipboardItem } from "../types";
import { ItemRow } from "./ItemRow";

interface ItemListProps {
  items: ClipboardItem[];
  selectedId: number | null;
  registerRef: (id: number, el: HTMLDivElement | null) => void;
  onSelect: (id: number) => void;
  onPaste: (it: ClipboardItem) => void;
  onCopy: (it: ClipboardItem) => void;
  onToggleFav: (it: ClipboardItem) => void;
  onEdit: (it: ClipboardItem) => void;
  onDelete: (id: number) => void;
  groupName: (id: number | null) => string | null;
  groupColor: (id: number | null) => string | null;
  emptyText: string;
}

export function ItemList(props: ItemListProps) {
  return (
    <div className="list">
      {props.items.length === 0 && <div className="empty">{props.emptyText}</div>}
      {props.items.map((it) => (
        <ItemRow
          key={it.id}
          item={it}
          selected={props.selectedId === it.id}
          registerRef={props.registerRef}
          onSelect={props.onSelect}
          onPaste={props.onPaste}
          onCopy={props.onCopy}
          onToggleFav={props.onToggleFav}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          groupName={props.groupName}
          groupColor={props.groupColor}
        />
      ))}
    </div>
  );
}
