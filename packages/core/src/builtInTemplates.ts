import type { BuiltInTemplateId, CodeTemplateDefinition, FieldDefinition } from "./template";

/*
 * The developer's part of each built-in template. Labels are i18n keys (`field.*`, `option.*`)
 * and units are i18n keys under `unit.*`; the apps translate them.
 */

const field = (key: string, type: FieldDefinition["type"], extra: Partial<FieldDefinition> = {}): FieldDefinition => ({
  key,
  type,
  label: `field.${key}`,
  required: false,
  ...extra,
});

const options = (...keys: string[]) => keys.map((key) => ({ key, label: `option.${key}` }));

export const movieTemplate: CodeTemplateDefinition = {
  fields: [
    field("release_date", "date"),
    field("director", "text_list"),
    field("runtime", "number", { unit: "min" }),
    field("genres", "text_list"),
    field("synopsis", "long_text"),
    field("cast", "text_list"),
    field("writers", "text_list"),
    field("original_language", "text"),
  ],
  identity: ["release_date", "director"],
  progress: null,
};

/** Series progress is computed from their seasons (child records), never stored. */
export const seriesTemplate: CodeTemplateDefinition = {
  fields: [
    field("first_air_date", "date"),
    field("creators", "text_list"),
    field("network", "text"),
    field("show_status", "select", { options: options("returning", "ended", "cancelled") }),
    field("genres", "text_list"),
    field("synopsis", "long_text"),
    field("cast", "text_list"),
    field("original_language", "text"),
  ],
  identity: ["first_air_date", "creators"],
  progress: null,
};

/** Internal: only used as a child record of a series (data model, seasons). */
export const seasonTemplate: CodeTemplateDefinition = {
  fields: [
    field("season_number", "number", { required: true }),
    field("episode_count", "number", { unit: "episodes" }),
    field("episodes_watched", "number", { unit: "episodes" }),
    field("air_date", "date"),
  ],
  identity: ["season_number"],
  progress: { field: "episodes_watched", total: "episode_count" },
};

export const bookTemplate: CodeTemplateDefinition = {
  fields: [
    field("author", "text_list"),
    field("publication_date", "date"),
    field("pages", "number", { unit: "pages" }),
    field("current_page", "number"),
    field("format", "select", { options: options("paperback", "hardcover", "ebook", "audiobook") }),
    field("saga", "text"),
    field("saga_number", "number"),
    field("publisher", "text"),
    field("isbn", "text"),
    field("genres", "text_list"),
    field("synopsis", "long_text"),
    field("original_language", "text"),
  ],
  identity: ["author", "publication_date"],
  progress: { field: "current_page", total: "pages" },
};

/** Games have no reliable total, so progress is hours played only. */
export const gameTemplate: CodeTemplateDefinition = {
  fields: [
    field("release_date", "date"),
    field("developers", "text_list"),
    field("publishers", "text_list"),
    field("platforms", "text_list"),
    field("hours_played", "number", { unit: "hours" }),
    field("genres", "text_list"),
    field("synopsis", "long_text"),
  ],
  identity: ["release_date", "developers"],
  progress: { field: "hours_played", total: null },
};

/** Anime: episodes directly on the record (each anime season is its own entry, as on AniList). */
export const animeTemplate: CodeTemplateDefinition = {
  fields: [
    field("first_air_date", "date"),
    field("studios", "text_list"),
    field("anime_format", "select", { options: options("tv", "movie_format", "ova", "ona", "special") }),
    field("episode_count", "number", { unit: "episodes" }),
    field("episodes_watched", "number", { unit: "episodes" }),
    field("genres", "text_list"),
    field("synopsis", "long_text"),
    field("original_title_romaji", "text"),
  ],
  identity: ["first_air_date", "studios"],
  progress: { field: "episodes_watched", total: "episode_count" },
};

const CODE_TEMPLATES: Partial<Record<BuiltInTemplateId, CodeTemplateDefinition>> = {
  movie: movieTemplate,
  series: seriesTemplate,
  season: seasonTemplate,
  book: bookTemplate,
  game: gameTemplate,
  anime: animeTemplate,
};

/** The developer's part of a template, or null for custom templates (and built-ins not written yet). */
export function codeTemplateFor(templateId: string): CodeTemplateDefinition | null {
  return CODE_TEMPLATES[templateId as BuiltInTemplateId] ?? null;
}
