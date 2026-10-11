import { describe, expect, it } from "vitest";
import { bookTemplate, gameTemplate, movieTemplate } from "./builtInTemplates";
import { buildEffectiveTemplate } from "./effectiveTemplate";
import { recordProgress, seriesProgress } from "./progress";
import type { MediaRecord } from "./record";

const record = (fields: MediaRecord["fields"]): MediaRecord => ({
  id: "x",
  template: "book",
  parent_id: null,
  title: "x",
  original_title: null,
  status: "in_progress",
  rating: null,
  notes: null,
  fields,
  created_at: 0,
  updated_at: 0,
  deleted_at: null,
});

describe("recordProgress", () => {
  const book = buildEffectiveTemplate(bookTemplate, {});

  it("computes current, total and percent", () => {
    expect(recordProgress(record({ current_page: 120, pages: 400 }), book)).toEqual({ current: 120, total: 400, percent: 30 });
  });

  it("has no percent without a total", () => {
    const game = buildEffectiveTemplate(gameTemplate, {});
    expect(recordProgress(record({ hours_played: 12 }), game)).toEqual({ current: 12, total: null, percent: null });
  });

  it("is null for templates without progress, or with nothing entered", () => {
    expect(recordProgress(record({}), buildEffectiveTemplate(movieTemplate, {}))).toBeNull();
    expect(recordProgress(record({}), book)).toBeNull();
  });

  it("caps the percent at 100", () => {
    expect(recordProgress(record({ current_page: 500, pages: 400 }), book)?.percent).toBe(100);
  });
});

describe("seriesProgress", () => {
  const season = (n: number, watched: number, count?: number) =>
    record({ season_number: n, episodes_watched: watched, ...(count === undefined ? {} : { episode_count: count }) });

  it("adds up its seasons and points at the latest one watched", () => {
    expect(seriesProgress([season(1, 10, 10), season(2, 5, 10), season(3, 0, 8)])).toEqual({
      current: 15,
      total: 28,
      percent: 54,
      season: 2,
      episode: 5,
    });
  });

  it("has no total while any season lacks an episode count", () => {
    expect(seriesProgress([season(1, 10, 10), season(2, 3)])).toMatchObject({ total: null, percent: null, season: 2, episode: 3 });
  });

  it("is null without seasons", () => {
    expect(seriesProgress([])).toBeNull();
  });
});
