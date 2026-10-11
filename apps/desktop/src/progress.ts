import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildEffectiveTemplate,
  codeTemplateFor,
  listChildrenByParent,
  recordProgress,
  seriesProgress,
  type MediaRecord,
  type Uuid,
} from "@remedia/core";
import { data } from "./db/database";

export interface ProgressInfo {
  /** 0-100 when there is a total; null shows the label only. */
  percent: number | null;
  /** Short text: "p. 120 / 400", "Ep. 5 / 12", "S2 · E5", "12 h". */
  label: string;
}

/** Which label style each type uses; anything else gets the generic "current / total". */
const LABEL_STYLE: Record<string, "pages" | "episodes" | "hours"> = {
  book: "pages",
  season: "episodes",
  anime: "episodes",
  game: "hours",
};

/**
 * Turns a record's progress into a percent and a short label. Series need their seasons,
 * because their progress is computed from them (data model), never stored.
 */
export function useProgress() {
  const { t } = useTranslation();

  return (record: MediaRecord, seasons?: MediaRecord[]): ProgressInfo | null => {
    if (record.template === "series") {
      const p = seriesProgress(seasons ?? []);
      if (!p || p.current === 0) return null;
      return { percent: p.percent, label: t("progress.series", { season: p.season, episode: p.episode }) };
    }

    // TODO: include the user's template changes once templates are editable.
    const p = recordProgress(record, buildEffectiveTemplate(codeTemplateFor(record.template), {}));
    if (!p) return null;
    const style = LABEL_STYLE[record.template];
    const key = style === "hours" ? "progress.hours" : `progress.${style ?? "generic"}${p.total === null ? "Only" : ""}`;
    return { percent: p.percent, label: t(key, { current: p.current, total: p.total }) };
  };
}

/** Every series' seasons, by series id. Reloads when `version` changes. */
export function useSeasonsByParent(version = 0): Map<Uuid, MediaRecord[]> {
  const [map, setMap] = useState<Map<Uuid, MediaRecord[]>>(new Map());
  useEffect(() => {
    listChildrenByParent(data).then(setMap);
  }, [version]);
  return map;
}
