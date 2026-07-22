import type { ClipboardItem } from "../types";
import { ItemRow } from "./ItemRow";

interface ItemListProps {
  items: ClipboardItem[];
  selectedId: number | null;
  registerRef: (id: number, el: HTMLDivElement | null) => void;
  onSelect: (id: number) => void;
  onEdit: (it: ClipboardItem) => void;
  onCopy: (id: number) => void;
  onToggleFav: (it: ClipboardItem) => void;
  onDelete: (id: number) => void;
  groupName: (id: number | null) => string | null;
  emptyText: string;
  tab: "fav" | "all";
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
          onEdit={props.onEdit}
          onCopy={props.onCopy}
          onToggleFav={props.onToggleFav}
          onDelete={props.onDelete}
          groupName={props.groupName}
          tab={props.tab}
        />
      ))}
    </div>
  );
}
