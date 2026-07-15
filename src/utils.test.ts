import { describe, expect, it } from "vitest";
import { fmtTime, fuzzyMatch } from "./utils";

describe("fmtTime", () => {
  it("单数字月/日/时/分补零到 2 位", () => {
    expect(fmtTime(new Date(2026, 0, 5, 9, 7).getTime())).toBe("01-05 09:07");
  });
  it("双数字保持不变", () => {
    expect(fmtTime(new Date(2026, 10, 23, 14, 30).getTime())).toBe("11-23 14:30");
  });
});

describe("fuzzyMatch", () => {
  it("空查询匹配任意文本", () => {
    expect(fuzzyMatch("abc", "")).toBe(true);
  });
  it("匹配子序列", () => {
    expect(fuzzyMatch("hello world", "hwd")).toBe(true);
  });
  it("大小写不敏感", () => {
    expect(fuzzyMatch("Hello", "he")).toBe(true);
    expect(fuzzyMatch("HELLO", "he")).toBe(true);
  });
  it("非子序列返回 false", () => {
    expect(fuzzyMatch("abc", "cab")).toBe(false);
  });
  it("完全相等视为子序列", () => {
    expect(fuzzyMatch("abc", "abc")).toBe(true);
  });
});
