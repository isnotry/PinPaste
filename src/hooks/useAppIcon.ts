import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

/**
 * 内存缓存：app_name → data URI（或 null 表示无图标）
 */
const cache = new Map<string, string | null>();

/**
 * 批量请求队列：收集同一 tick 内所有 useAppIcon 调用，合并为一次 invoke。
 */
let pendingNames: string[] = [];
let pendingResolvers: Array<{ name: string; resolve: (v: string | null) => void }> = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function flushBatch() {
  batchTimer = null;
  if (pendingNames.length === 0) return;

  const names = [...new Set(pendingNames)];
  const resolvers = pendingResolvers;
  pendingNames = [];
  pendingResolvers = [];

  invoke<Record<string, string | null>>("get_app_icons", { appNames: names })
    .then((map) => {
      for (const { name, resolve } of resolvers) {
        const base64 = map[name] ?? null;
        const dataUri = base64 ? `data:image/png;base64,${base64}` : null;
        cache.set(name, dataUri);
        resolve(dataUri);
      }
    })
    .catch(() => {
      for (const { name, resolve } of resolvers) {
        cache.set(name, null);
        resolve(null);
      }
    });
}

function requestIcon(name: string): Promise<string | null> {
  if (cache.has(name)) {
    return Promise.resolve(cache.get(name) ?? null);
  }
  return new Promise((resolve) => {
    pendingNames.push(name);
    pendingResolvers.push({ name, resolve });
    if (batchTimer === null) {
      batchTimer = setTimeout(flushBatch, 0);
    }
  });
}

/**
 * 获取 App 图标的 data URI，带内存缓存 + 批量请求。
 * 同一 render tick 内的所有调用合并为一次后端 invoke。
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
    requestIcon(appName).then((dataUri) => {
      if (!cancelled) setIcon(dataUri);
    });
    return () => {
      cancelled = true;
    };
  }, [appName]);

  return icon;
}
