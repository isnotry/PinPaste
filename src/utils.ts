/** 时间戳格式化为 `MM-DD HH:mm`（月/日/时/分均补零到 2 位） */
export function fmtTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 子序列模糊匹配：query 的字符是否按顺序作为子序列出现在 text 中（大小写不敏感） */
export function fuzzyMatch(text: string, q: string): boolean {
  if (!q) return true;
  const t = text.toLowerCase();
  const query = q.toLowerCase();
  let i = 0;
  for (const ch of t) {
    if (ch === query[i]) i++;
    if (i === query.length) return true;
  }
  return false;
}
