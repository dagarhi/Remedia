import type { BuiltInTemplateId, CodeTemplateDefinition } from "./template";

/** Labels are i18n keys; the apps translate them. */
export const movieTemplate: CodeTemplateDefinition = {
  fields: [
    { key: "release_date", type: "date", label: "field.release_date", required: false },
    { key: "director", type: "text_list", label: "field.director", required: false },
    { key: "runtime", type: "number", label: "field.runtime", required: false, unit: "min" },
    { key: "genres", type: "text_list", label: "field.genres", required: false },
    { key: "synopsis", type: "long_text", label: "field.synopsis", required: false },
    { key: "cast", type: "text_list", label: "field.cast", required: false },
    { key: "writers", type: "text_list", label: "field.writers", required: false },
    { key: "original_language", type: "text", label: "field.original_language", required: false },
  ],
  identity: ["release_date", "director"],
  progress: null,
};

// Series, book, game and season are added in roadmap phase 3.
const CODE_TEMPLATES: Partial<Record<BuiltInTemplateId, CodeTemplateDefinition>> = {
  movie: movieTemplate,
};

/** The developer's part of a template, or null for custom templates (and built-ins not written yet). */
export function codeTemplateFor(templateId: string): CodeTemplateDefinition | null {
  return CODE_TEMPLATES[templateId as BuiltInTemplateId] ?? null;
}
