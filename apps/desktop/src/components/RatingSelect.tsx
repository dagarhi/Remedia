import { useTranslation } from "react-i18next";
import { formatDisplayRating, fromDisplayRating, ratingScaleSpec, toDisplayRating } from "@remedia/core";
import { useRatingScale } from "../settings/SettingsContext";
import { Select } from "./Select";

interface RatingSelectProps {
  id?: string;
  /** Decides the display scale (Settings › Record types). */
  templateId: string;
  /** Stored scale, 1-100; null = not rated. */
  value: number | null;
  onChange: (stored: number | null) => void;
}

/** Picks a rating on the type's display scale and reports it on the stored scale. */
export function RatingSelect({ id, templateId, value, onChange }: RatingSelectProps) {
  const { t } = useTranslation();
  const scale = useRatingScale(templateId);
  const { max, step } = ratingScaleSpec(scale);
  const options = Array.from({ length: max / step }, (_, i) => (i + 1) * step);
  const shown = value === null ? "" : toDisplayRating(value, scale);

  return (
    <Select
      id={id}
      value={shown}
      onChange={(e) => onChange(e.target.value === "" ? null : fromDisplayRating(Number(e.target.value), scale))}
    >
      <option value="">{t("record.notRated")}</option>
      {options.map((r) => (
        <option key={r} value={r}>
          {formatDisplayRating(r, scale)}
        </option>
      ))}
    </Select>
  );
}
