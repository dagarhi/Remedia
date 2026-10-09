import { describe, expect, it } from "vitest";
import { parseThemeFile, themeFileJsonSchema, validateThemeFile } from "./validate";

const meta = { formatVersion: 1, id: "my-theme", name: "My theme", appearance: "dark" };

describe("validateThemeFile", () => {
  it("accepts a file with only metadata", () => {
    expect(validateThemeFile(meta)).toEqual({ ok: true, theme: meta, warnings: [] });
  });

  it("keeps valid tokens and drops invalid or unknown ones with warnings", () => {
    const result = validateThemeFile({
      ...meta,
      colors: { accent: "#123456", text: "red", glow: "#FFFFFF" },
      shape: { radiusTag: "full", radiusCard: -2 },
    });
    expect(result).toEqual({
      ok: true,
      theme: { ...meta, colors: { accent: "#123456" }, shape: { radiusTag: "full" } },
      warnings: [
        { path: "colors.text", code: "invalid_value" },
        { path: "colors.glow", code: "unknown_key" },
        { path: "shape.radiusCard", code: "invalid_value" },
      ],
    });
  });

  it("drops a section that is not an object", () => {
    expect(validateThemeFile({ ...meta, colors: "dark" })).toMatchObject({
      ok: true,
      warnings: [{ path: "colors", code: "invalid_value" }],
    });
  });

  it("warns about unknown top-level keys", () => {
    expect(validateThemeFile({ ...meta, extra: 1 })).toMatchObject({
      warnings: [{ path: "extra", code: "unknown_key" }],
    });
  });

  it("rejects a newer format version", () => {
    expect(validateThemeFile({ ...meta, formatVersion: 2 })).toEqual({
      ok: false,
      error: "unsupported_format_version",
    });
  });

  it.each([
    ["missing id", { ...meta, id: undefined }],
    ["id not kebab-case", { ...meta, id: "My Theme" }],
    ["empty name", { ...meta, name: "  " }],
    ["unknown appearance", { ...meta, appearance: "sepia" }],
  ])("rejects broken metadata: %s", (_, input) => {
    expect(validateThemeFile(input)).toEqual({ ok: false, error: "invalid_metadata" });
  });

  it("rejects non-objects", () => {
    expect(validateThemeFile([])).toEqual({ ok: false, error: "not_an_object" });
  });
});

describe("parseThemeFile", () => {
  it("rejects text that is not JSON", () => {
    expect(parseThemeFile("{ nope")).toEqual({ ok: false, error: "invalid_json" });
  });
});

describe("themeFileJsonSchema", () => {
  it("lists every section", () => {
    const schema = themeFileJsonSchema() as { properties: Record<string, unknown> };
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(["formatVersion", "id", "colors", "typography", "shape"]),
    );
  });
});
