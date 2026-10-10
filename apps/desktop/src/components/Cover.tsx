import { useState } from "react";
import { iconForType } from "../recordTypes";
import { useImageUrl } from "../images";
import "./Cover.css";

interface CoverProps {
  /** Relative path of the cover image; null shows the type icon instead. */
  path: string | null | undefined;
  templateId: string;
  /** Size of the placeholder icon. */
  iconSize?: number;
  className?: string;
}

/** A record's cover in a 2:3 frame, or the type icon when there is none (or it fails to load). */
export function Cover({ path, templateId, iconSize = 36, className = "" }: CoverProps) {
  const url = useImageUrl(path);
  // Remembers which URL failed, so choosing a new image shows it again.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const Icon = iconForType(templateId);

  return (
    <span className={`cover ${className}`} aria-hidden>
      {url && url !== brokenUrl ? (
        <img src={url} alt="" onError={() => setBrokenUrl(url)} />
      ) : (
        <Icon size={iconSize} />
      )}
    </span>
  );
}
