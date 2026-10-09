import { describe, expect, it } from "vitest";
import { buildEffectiveTemplate } from "./effectiveTemplate";
import type { CodeTemplateDefinition, FieldDefinition } from "./template";

const code: CodeTemplateDefinition = {
  fields: [
    { key: "release_date", type: "date", label: "field.release_date", required: false },
    { key: "runtime", type: "number", label: "field.runtime", required: false, unit: "min" },
    {
      key: "format",
      type: "select",
      label: "field.format",
      required: false,
      options: [{ key: "bluray", label: "option.bluray" }],
    },
  ],
  identity: ["release_date"],
  progress: null,
};

const userField: FieldDefinition = { key: "u-1", type: "boolean", label: "Seen at the cinema", required: false };

const keys = (t: ReturnType<typeof buildEffectiveTemplate>) => t.fields.map((f) => f.key);

describe("buildEffectiveTemplate", () => {
  it("uses the code definition untouched when the user changed nothing", () => {
    const t = buildEffectiveTemplate(code, {});
    expect(keys(t)).toEqual(["release_date", "runtime", "format"]);
    expect(t.fields[1]).toMatchObject({
      label: { kind: "i18n", key: "field.runtime" },
      unit: "min",
      hidden: false,
      builtIn: true,
    });
    expect(t.identity).toEqual(["release_date"]);
  });

  it("applies overrides property by property", () => {
    const t = buildEffectiveTemplate(code, {
      overrides: { runtime: { label: "Duración" }, format: { hidden: true } },
    });
    const runtime = t.fields.find((f) => f.key === "runtime")!;
    expect(runtime.label).toEqual({ kind: "text", text: "Duración" });
    expect(runtime.unit).toBe("min"); // untouched property still follows the code
    expect(t.fields.find((f) => f.key === "format")!.hidden).toBe(true);
  });

  it("appends user options to a built-in select", () => {
    const t = buildEffectiveTemplate(code, {
      overrides: { format: { added_options: [{ key: "o-1", label: "VHS" }] } },
    });
    expect(t.fields.find((f) => f.key === "format")!.options).toEqual([
      { key: "bluray", label: { kind: "i18n", key: "option.bluray" } },
      { key: "o-1", label: { kind: "text", text: "VHS" } },
    ]);
  });

  it("adds user fields after built-in ones by default", () => {
    const t = buildEffectiveTemplate(code, { added: [userField] });
    expect(keys(t)).toEqual(["release_date", "runtime", "format", "u-1"]);
    expect(t.fields[3]).toMatchObject({ label: { kind: "text", text: "Seen at the cinema" }, builtIn: false });
  });

  it("follows the custom order and appends fields it does not mention", () => {
    const t = buildEffectiveTemplate(code, { added: [userField], order: ["u-1", "runtime", "gone"] });
    expect(keys(t)).toEqual(["u-1", "runtime", "release_date", "format"]);
  });

  it("ignores identity set by the user on built-in templates", () => {
    const t = buildEffectiveTemplate(code, { added: [userField], identity: ["u-1"] });
    expect(t.identity).toEqual(["release_date"]);
  });

  it("builds a custom template from the user part alone", () => {
    const t = buildEffectiveTemplate(null, {
      added: [
        { key: "a", type: "number", label: "Players", required: false },
        { key: "b", type: "date", label: "Year", required: false },
      ],
      identity: ["b", "missing"],
      progress: { field: "a", total: null },
    });
    expect(keys(t)).toEqual(["a", "b"]);
    expect(t.identity).toEqual(["b"]);
    expect(t.progress).toEqual({ field: "a", total: null });
  });
});
