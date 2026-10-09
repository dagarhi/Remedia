import { describe, expect, it } from "vitest";
import { buildEffectiveTemplate } from "./effectiveTemplate";
import { compactFields, validateFields } from "./fields";

const template = buildEffectiveTemplate(null, {
  added: [
    { key: "title_es", type: "text", label: "Spanish title", required: true },
    { key: "authors", type: "text_list", label: "Authors", required: false },
    { key: "pages", type: "number", label: "Pages", required: false },
    { key: "published", type: "date", label: "Published", required: false },
    { key: "site", type: "url", label: "Site", required: false },
    { key: "owned", type: "boolean", label: "Owned", required: false },
    {
      key: "format",
      type: "select",
      label: "Format",
      required: false,
      options: [{ key: "ebook", label: "Ebook" }],
    },
    { key: "old", type: "text", label: "Old", required: true, hidden: true },
  ],
});

describe("validateFields", () => {
  it("accepts valid values and ignores unknown keys", () => {
    expect(
      validateFields(
        {
          title_es: "Duna",
          authors: ["Frank Herbert"],
          pages: 0,
          published: "1965-08",
          site: "https://example.com/dune",
          owned: false,
          format: "ebook",
          from_newer_version: 42,
        },
        template,
      ),
    ).toEqual([]);
  });

  it("reports missing required fields, but not hidden ones", () => {
    expect(validateFields({}, template)).toEqual([{ key: "title_es", code: "required" }]);
  });

  it.each([
    ["title_es", "   ", "empty"],
    ["title_es", 3, "wrong_type"],
    ["authors", [], "empty"],
    ["authors", ["ok", ""], "empty"],
    ["pages", "300", "wrong_type"],
    ["pages", Number.NaN, "wrong_type"],
    ["published", "1965-13", "invalid_date"],
    ["published", "65", "invalid_date"],
    ["site", "example.com", "invalid_url"],
    ["owned", "yes", "wrong_type"],
    ["format", "hardcover", "unknown_option"],
    ["old", 1, "wrong_type"],
  ])("%s = %j is %s", (key, value, code) => {
    const fields: Record<string, unknown> = { title_es: "Duna", [key]: value };
    expect(validateFields(fields, template)).toEqual([{ key, code }]);
  });

  it.each(["2016", "2016-11", "2016-11-11"])("accepts the partial date %s", (date) => {
    expect(validateFields({ title_es: "x", published: date }, template)).toEqual([]);
  });
});

describe("compactFields", () => {
  it("trims text and drops empty values, keeping false and 0", () => {
    expect(
      compactFields({
        title_es: "  Duna ",
        notes: "   ",
        authors: [" Frank Herbert ", " "],
        tags: [],
        pages: 0,
        owned: false,
        format: null,
        site: undefined,
      }),
    ).toEqual({ title_es: "Duna", authors: ["Frank Herbert"], pages: 0, owned: false });
  });
});
