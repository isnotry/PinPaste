import { useEffect, useState } from "react";
import { getImageData } from "../api";

type ThumbState = "loading" | "ok" | "error";

interface ImageThumbProps {
  id: number;
  onPreview?: (src: string) => void;
}

export function ImageThumb({ id, onPreview }: ImageThumbProps) {
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

  if (state === "error") {
    return <div className="thumb">🖼️</div>;
  }

  const handleClick = (e: React.MouseEvent) => {
    if (src && onPreview) {
      e.stopPropagation();
      onPreview(src);
    }
  };

  return (
    <div className={`thumb${src && onPreview ? " thumb-clickable" : ""}`} onClick={handleClick}>
      {src ? <img src={src} alt="clipboard image" /> : "⏳"}
    </div>
  );
}
