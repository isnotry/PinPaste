import { useEffect, useState } from "react";
import { getImageData } from "../api";

type ThumbState = "loading" | "ok" | "error";

export function ImageThumb({ id }: { id: number }) {
  const [state, setState] = useState<ThumbState>("loading");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    getImageData(id)
      .then((d) => {
        if (!alive) return;
        setSrc(d);
        setState("ok");
      })
      .catch((e) => {
        if (!alive) return;
        console.error("加载图片失败", e);
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // 加载失败给出明确占位，避免与"加载中"混淆（P1-6）
  if (state === "error") {
    return <div className="thumb">🖼️</div>;
  }
  return <div className="thumb">{src ? <img src={src} alt="" /> : "⏳"}</div>;
}
