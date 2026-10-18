import { useTranslation } from "react-i18next";
import { ImagePlus } from "lucide-react";
import { AVATAR_ICONS, type Avatar as AvatarValue } from "@remedia/core";
import { pickImage } from "../images";
import { Avatar } from "./Avatar";

interface AvatarPickerProps {
  value: AvatarValue;
  onChange: (avatar: AvatarValue) => void;
}

/** Built-in animals plus "use my own image" (copied into the app's images folder). */
export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const { t } = useTranslation();

  async function chooseImage() {
    const path = await pickImage("avatars").catch(() => null);
    if (path) onChange(`image:${path}`);
  }

  return (
    <div className="avatar-picker" role="group" aria-label={t("profile.avatar")}>
      {AVATAR_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          className="avatar-choice"
          aria-pressed={value === `icon:${icon}`}
          aria-label={t(`profile.animals.${icon}`)}
          title={t(`profile.animals.${icon}`)}
          onClick={() => onChange(`icon:${icon}`)}
        >
          <Avatar value={`icon:${icon}`} size={36} />
        </button>
      ))}
      {value.startsWith("image:") && (
        <span className="avatar-choice" aria-pressed="true">
          <Avatar value={value} size={36} />
        </span>
      )}
      <button type="button" className="button" onClick={chooseImage}>
        <ImagePlus size={16} aria-hidden /> {t("profile.ownImage")}
      </button>
    </div>
  );
}
