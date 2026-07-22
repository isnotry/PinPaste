import { render, screen, fireEvent } from "@testing-library/react";
import { ItemRow } from "./ItemRow";
import type { ClipboardItem } from "../types";

vi.mock("../api", () => ({ getImageData: () => Promise.resolve("") }));

const mkItem = (over: Partial<ClipboardItem> = {}): ClipboardItem => ({
  id: 1,
  item_type: "text",
  content: "剪贴板内容",
  image_path: null,
  app_source: "浏览器",
  name: null,
  favorite: 0,
  group_id: 2,
  created_at: 1700000000000,
  ...over,
});

const baseProps = (it: ClipboardItem) => ({
  item: it,
  selected: false,
  registerRef: () => {},
  onSelect: vi.fn(),
  onEdit: vi.fn(),
  onCopy: vi.fn(),
  onToggleFav: vi.fn(),
  onDelete: vi.fn(),
  groupName: (id: number | null) => (id === 2 ? "工作" : null),
  tab: "all" as const,
});

describe("ItemRow", () => {
  it("自动剪切 tab 渲染来源、不显示分组标签", () => {
    render(<ItemRow {...baseProps(mkItem())} />);
    expect(screen.getByText("剪贴板内容")).toBeInTheDocument();
    expect(screen.getByText("浏览器")).toBeInTheDocument();
    expect(screen.queryByText("工作")).toBeNull();
  });

  it("收藏 tab 渲染分组、不显示来源", () => {
    render(<ItemRow {...baseProps(mkItem({ favorite: 1, app_source: "Chrome" }))} tab="fav" />);
    expect(screen.getByText("工作")).toBeInTheDocument();
    expect(screen.queryByText("Chrome")).toBeNull();
  });

  it("点击行触发 onSelect(id)", () => {
    const props = baseProps(mkItem());
    render(<ItemRow {...props} />);
    fireEvent.click(screen.getByText("剪贴板内容"));
    expect(props.onSelect).toHaveBeenCalledWith(1);
  });

  it("双击行触发 onCopy(id) 且不冒泡到 onSelect", () => {
    const props = baseProps(mkItem());
    render(<ItemRow {...props} />);
    fireEvent.doubleClick(screen.getByText("剪贴板内容"));
    expect(props.onCopy).toHaveBeenCalledWith(1);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("收藏按钮触发 onToggleFav 且不冒泡到 onSelect", () => {
    const props = baseProps(mkItem());
    render(<ItemRow {...props} />);
    fireEvent.click(screen.getByTitle("收藏"));
    expect(props.onToggleFav).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("选中态追加 selected class", () => {
    const { container } = render(<ItemRow {...baseProps(mkItem())} selected={true} />);
    expect(container.querySelector(".item.selected")).not.toBeNull();
  });

  it("已收藏项按钮显示 ★", () => {
    render(<ItemRow {...baseProps(mkItem({ favorite: 1 }))} />);
    expect(screen.getByTitle("取消收藏").textContent).toBe("★");
  });
});
