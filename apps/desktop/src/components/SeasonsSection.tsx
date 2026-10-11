import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import {
  createRecord,
  listChildren,
  seriesProgress,
  updateRecord,
  type MediaRecord,
  type Uuid,
} from "@remedia/core";
import { data } from "../db/database";
import { useCovers } from "../images";
import { useProgress } from "../progress";
import { Cover } from "./Cover";
import { ProgressBar } from "./ProgressBar";
import { useStatusLabel } from "./StatusSelect";
import "./SeasonsSection.css";

interface SeasonsSectionProps {
  series: MediaRecord;
  onOpenSeason: (id: Uuid) => void;
  /** Called after a change, so the page can reload what depends on seasons. */
  onChange?: () => void;
}

/** A series' seasons (child records): one row each with progress, +1 episode and a way in. */
export function SeasonsSection({ series, onOpenSeason, onChange }: SeasonsSectionProps) {
  const { t } = useTranslation();
  const progress = useProgress();
  const statusLabel = useStatusLabel();
  const covers = useCovers();
  const [seasons, setSeasons] = useState<MediaRecord[]>([]);

  const reload = () => listChildren(data, series.id).then(setSeasons);
  useEffect(() => {
    reload();
  }, [series.id]);

  async function addSeason() {
    const numbers = seasons.map((s) => (typeof s.fields.season_number === "number" ? s.fields.season_number : 0));
    const number = Math.max(0, ...numbers) + 1;
    await createRecord(data, {
      template: "season",
      parent_id: series.id,
      // Pre-filled in the UI language; the user can rename it (data model, season titles).
      title: t("season.title", { number }),
      fields: { season_number: number },
    });
    await reload();
    onChange?.();
  }

  async function addEpisode(season: MediaRecord) {
    const watched = typeof season.fields.episodes_watched === "number" ? season.fields.episodes_watched : 0;
    await updateRecord(data, season.id, { fields: { ...season.fields, episodes_watched: watched + 1 } });
    await reload();
    onChange?.();
  }

  const total = seriesProgress(seasons);

  return (
    <section className="seasons">
      <header className="seasons-header">
        <h2>{t("season.section")}</h2>
        <button type="button" className="button" onClick={addSeason}>
          <Plus size={14} aria-hidden /> {t("season.add")}
        </button>
      </header>

      {total && total.current > 0 && (
        <ProgressBar progress={{ percent: total.percent, label: progress(series, seasons)?.label ?? "" }} />
      )}

      {seasons.length === 0 ? (
        <p className="screen-placeholder">{t("season.empty")}</p>
      ) : (
        <ul className="seasons-list">
          {seasons.map((season) => {
            const p = progress(season);
            return (
              <li key={season.id} className="season-row">
                <button type="button" className="season-open" onClick={() => onOpenSeason(season.id)}>
                  <Cover
                    path={covers.get(season.id) ?? covers.get(series.id)}
                    templateId="season"
                    iconSize={16}
                    className="season-cover"
                  />
                  <span className="season-title">{season.title}</span>
                  <span className="season-status">{statusLabel("season", season.status)}</span>
                </button>
                <span className="season-progress">{p && <ProgressBar progress={p} />}</span>
                <button type="button" className="button" onClick={() => addEpisode(season)}>
                  {t("progress.addOne")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
