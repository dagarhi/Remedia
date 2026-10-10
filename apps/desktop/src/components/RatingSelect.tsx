import { useTranslation } from "react-i18next";
import { fromDisplayRating, ratingScaleSpec, toDisplayRating } from "@remedia/core";
import { RATING_SCALE } from "../preferences";
import { Select } from "./Select";

/** A stored rating (1-100) as stars on the current display scale. */
export function stars(stored: number): string {
  return "★".repeat(toDisplayRating(stored, RATING_SCALE));
}

interface RatingSelectProps {
  id?: string;
  /** Stored scale, 1-100; null = not rated. */
  value: number | null;
  onChange: (stored: number | null) => void;
}

/** Picks a rating on the display scale and reports it on the stored scale. */
export function RatingSelect({ id, value, onChange }: RatingSelectProps) {
  const { t } = useTranslation();
  const { max, step } = ratingScaleSpec(RATING_SCALE);
  const options = Array.from({ length: max / step }, (_, i) => (i + 1) * step);
  const shown = value === null ? "" : toDisplayRating(value, RATING_SCALE);

  return (
    <Select
      id={id}
      value={shown}
      onChange={(e) => onChange(e.target.value === "" ? null : fromDisplayRating(Number(e.target.value), RATING_SCALE))}
    >
      <option value="">{t("record.notRated")}</option>
      {options.map((r) => (
        <option key={r} value={r}>
          {"★".repeat(r)}
        </option>
      ))}
    </Select>
  );
}
