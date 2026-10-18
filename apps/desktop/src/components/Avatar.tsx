import { Bird, Cat, Dog, Fish, Panda, Rabbit, Rat, Snail, Squirrel, Turtle, type LucideIcon } from "lucide-react";
import type { Avatar as AvatarValue, AvatarIcon } from "@remedia/core";
import { useImageUrl } from "../images";
import "./Avatar.css";

/** Built-in avatar id -> icon. */
export const AVATAR_ICON_COMPONENTS: Record<AvatarIcon, LucideIcon> = {
  cat: Cat,
  dog: Dog,
  rabbit: Rabbit,
  bird: Bird,
  fish: Fish,
  turtle: Turtle,
  squirrel: Squirrel,
  snail: Snail,
  rat: Rat,
  panda: Panda,
};

interface AvatarProps {
  value: AvatarValue;
  /** Diameter in px. */
  size?: number;
}

/** The profile picture: a built-in animal on the accent colour, or the user's own image. */
export function Avatar({ value, size = 32 }: AvatarProps) {
  const imagePath = value.startsWith("image:") ? value.slice("image:".length) : null;
  const url = useImageUrl(imagePath);
  const Icon = imagePath ? null : AVATAR_ICON_COMPONENTS[value.slice("icon:".length) as AvatarIcon] ?? Cat;

  return (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden>
      {url ? <img src={url} alt="" /> : Icon && <Icon size={Math.round(size * 0.55)} />}
    </span>
  );
}
