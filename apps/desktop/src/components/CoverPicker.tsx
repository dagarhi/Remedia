import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, X } from "lucide-react";
import { pickImage } from "../images";
import { Cover } from "./Cover";

interface CoverPickerProps {
  templateId: string;
  /** Relative path of the chosen cover; null = none. */
  value: string | null;
  onChange: (path: string | null) => void;
}

/**
 * Chooses a cover from the user's computer. The file is copied into the app's images
 * folder right away; the record only points to the copy once the form is saved.
 */
export function CoverPicker({ templateId, value, onChange }: CoverPickerProps) {
  const { t } = useTranslation();
  const [error, setError] = useState(false);

  async function choose() {
    setError(false);
    try {
      const path = await pickImage("covers");
      if (path) onChange(path);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="cover-picker">
      <button type="button" className="cover-picker-preview-button" aria-label={t(value ? "cover.change" : "cover.choose")} onClick={choose}>
        <Cover path={value} templateId={templateId} className="cover-picker-preview" />
      </button>
      <div className="cover-picker-actions">
        <button type="button" className="button" onClick={choose}>
          <ImagePlus size={16} aria-hidden /> {t(value ? "cover.change" : "cover.choose")}
        </button>
        {value && (
          <button type="button" className="button" onClick={() => onChange(null)}>
            <X size={16} aria-hidden /> {t("cover.remove")}
          </button>
        )}
        {error && <p className="form-error">{t("cover.importFailed")}</p>}
      </div>
    </div>
  );
}
