import type { EffectiveTemplate } from "./effectiveTemplate";
import type { MediaRecord } from "./record";

export interface Progress {
  current: number;
  /** Null when the template has no total or it is unknown (ongoing series, games). */
  total: number | null;
  /** 0-100, only when there is a total. */
  percent: number | null;
}

const numberField = (record: MediaRecord, key: string | null): number | null => {
  if (!key) return null;
  const value = record.fields[key];
  return typeof value === "number" ? value : null;
};

const percentOf = (current: number, total: number | null): number | null =>
  total && total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : null;

/**
 * A record's progress from the field its template marks as progress (data model, Progress).
 * Null when the template has no progress (movies) or nothing has been entered yet.
 */
export function recordProgress(record: MediaRecord, template: EffectiveTemplate): Progress | null {
  if (!template.progress) return null;
  const current = numberField(record, template.progress.field);
  const total = numberField(record, template.progress.total);
  if (current === null && total === null) return null;
  return { current: current ?? 0, total, percent: percentOf(current ?? 0, total) };
}

export interface SeriesProgress extends Progress {
  /** The latest season with episodes watched, and how many: "S2 · E5". */
  season: number | null;
  episode: number | null;
}

/**
 * A series' progress, computed from its seasons and never stored. The total is only known
 * when every season has an episode count.
 */
export function seriesProgress(seasons: MediaRecord[]): SeriesProgress | null {
  if (seasons.length === 0) return null;
  let watched = 0;
  let total: number | null = 0;
  let latest: { season: number; episode: number } | null = null;

  for (const season of seasons) {
    const number = numberField(season, "season_number") ?? 0;
    const seen = numberField(season, "episodes_watched") ?? 0;
    const count = numberField(season, "episode_count");
    watched += seen;
    total = total === null || count === null ? null : total + count;
    if (seen > 0 && (!latest || number > latest.season)) latest = { season: number, episode: seen };
  }

  return {
    current: watched,
    total,
    percent: percentOf(watched, total),
    season: latest?.season ?? null,
    episode: latest?.episode ?? null,
  };
}
