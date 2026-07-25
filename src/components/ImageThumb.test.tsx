import { render, screen } from "@testing-library/react";
import { ImageThumb } from "./ImageThumb";

const mockGetImageData = vi.fn();
vi.mock("../api", () => ({ getImageData: (...a: unknown[]) => mockGetImageData(...a) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ImageThumb", () => {
  it("加载中显示 ⏳ 占位（P1-6 不再无限转圈）", () => {
    mockGetImageData.mockReturnValue(new Promise<string>(() => {})); // 永不 resolve
    render(<ImageThumb id={1} />);
    expect(screen.getByText("⏳")).toBeInTheDocument();
  });

  it("加载成功渲染 <img> 并带 data", async () => {
    mockGetImageData.mockResolvedValue("data:image/png;base64,AAAA");
    render(<ImageThumb id={1} />);
    const img = await screen.findByRole("img");
    expect(img).toHaveAttribute("src", "data:image/png;base64,AAAA");
  });

  it("加载失败显示 🖼️ 占位终态，而非持续 loading", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetImageData.mockRejectedValue(new Error("decode fail"));
    render(<ImageThumb id={1} />);
    expect(await screen.findByText("🖼️")).toBeInTheDocument();
    expect(screen.queryByText("⏳")).not.toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
