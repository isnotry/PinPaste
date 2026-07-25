import { useEffect, useState } from "react";
import { getAppIcon } from "../api";

const cache = new Map<string, string | null>();

/**
 * 获取 App 图标的 base64 data URI，带内存缓存。
 * 同一个 app name 只请求一次后端。
 */
export function useAppIcon(appName: string | null | undefined): string | null {
  const [icon, setIcon] = useState<string | null>(appName ? (cache.get(appName) ?? null) : null);

  useEffect(() => {
    if (!appName) {
      setIcon(null);
      return;
    }
    if (cache.has(appName)) {
      setIcon(cache.get(appName) ?? null);
      return;
    }
    let cancelled = false;
    getAppIcon(appName)
      .then((base64) => {
        const dataUri = base64 ? `data:image/png;base64,${base64}` : null;
        cache.set(appName, dataUri);
        if (!cancelled) setIcon(dataUri);
      })
      .catch(() => {
        cache.set(appName, null);
        if (!cancelled) setIcon(null);
      });
    return () => {
      cancelled = true;
    };
  }, [appName]);

  return icon;
}
