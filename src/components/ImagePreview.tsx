interface ImagePreviewProps {
  src: string | null;
  onClose: () => void;
}

/** 全屏图片预览：点击任意位置关闭，支持 Esc 关闭 */
export function ImagePreview({ src, onClose }: ImagePreviewProps) {
  if (!src) return null;
  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <img src={src} alt="预览" className="image-preview-img" />
    </div>
  );
}
