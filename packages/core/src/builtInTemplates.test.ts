import { describe, expect, it } from "vitest";
import { codeTemplateFor, movieTemplate } from "./builtInTemplates";
import { buildEffectiveTemplate } from "./effectiveTemplate";
import { validateFields } from "./fields";

describe("movieTemplate", () => {
  const keys = movieTemplate.fields.map((f) => f.key);

  it("has unique field keys", () => {
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("only marks existing fields as identity", () => {
    expect(movieTemplate.identity.every((key) => keys.includes(key))).toBe(true);
  });

  it("accepts a typical movie", () => {
    const template = buildEffectiveTemplate(movieTemplate, {});
    const arrival = {
      release_date: "2016-11-11",
      director: ["Denis Villeneuve"],
      runtime: 116,
      genres: ["Science fiction", "Drama"],
      original_language: "English",
    };
    expect(validateFields(arrival, template)).toEqual([]);
  });
});

describe("codeTemplateFor", () => {
  it("returns the movie definition and null for custom templates", () => {
    expect(codeTemplateFor("movie")).toBe(movieTemplate);
    expect(codeTemplateFor("3f2b8c1e-1d2c-4b5a-9e8f-0a1b2c3d4e5f")).toBeNull();
  });
});
