import type { ThemeMode } from "./types";

export type ResolvedTheme = "light" | "dark";

const KEY = "pinpaste-theme-mode";

export function getStoredMode(): ThemeMode {
  const saved = localStorage.getItem(KEY);
  if (saved === "system" || saved === "light" || saved === "dark") return saved;
  return "system";
}

export function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    const prefersDark =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  return mode;
}

export function applyMode(mode: ThemeMode): void {
  const resolved = resolveMode(mode);
  document.documentElement.setAttribute("data-theme", resolved);
  localStorage.setItem(KEY, mode);
}

/** 当模式为「跟随系统」时，监听系统主题切换并实时应用 */
export function watchSystemTheme(onChange: (t: ResolvedTheme) => void): () => void {
  if (!window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? "dark" : "light");
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
