import { describe, expect, it } from "vitest";
import { fmtTime, searchMatch } from "./utils";

describe("fmtTime", () => {
  it("单数字月/日/时/分补零到 2 位", () => {
    expect(fmtTime(new Date(2026, 0, 5, 9, 7).getTime())).toBe("01-05 09:07");
  });
  it("双数字保持不变", () => {
    expect(fmtTime(new Date(2026, 10, 23, 14, 30).getTime())).toBe("11-23 14:30");
  });
});

describe("searchMatch", () => {
  it("空查询匹配任意文本", () => {
    expect(searchMatch("abc", "")).toBe(true);
    expect(searchMatch("abc", "   ")).toBe(true);
  });
  it("子串命中", () => {
    expect(searchMatch("hello world", "world")).toBe(true);
    expect(searchMatch("hello world", "lo wo")).toBe(true);
  });
  it("大小写不敏感", () => {
    expect(searchMatch("Hello", "hell")).toBe(true);
    expect(searchMatch("HELLO", "ell")).toBe(true);
  });
  it("空格分词为 AND 语义，每个词都需命中", () => {
    expect(searchMatch("the quick brown fox", "quick fox")).toBe(true);
    expect(searchMatch("the quick brown fox", "quick cat")).toBe(false);
  });
  it("不再做子序列匹配，避免长文本误命中", () => {
    // 子序列匹配会让 "hwd" 命中 "hello world"；子串匹配不会
    expect(searchMatch("hello world", "hwd")).toBe(false);
    expect(searchMatch("abc", "cab")).toBe(false);
  });
  it("完全相等命中", () => {
    expect(searchMatch("abc", "abc")).toBe(true);
  });
});
