/** 时间戳格式化为 `MM-DD HH:mm`（月/日/时/分均补零到 2 位） */
export function fmtTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 搜索匹配：大小写不敏感的子串匹配，支持空格分词（每个词都需命中，AND 语义）。
 * 空查询匹配任意文本。
 * 相比子序列模糊匹配，避免长文本下“c…o…d…e”式的大量误命中。
 */
export function searchMatch(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = text.toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}
