import { describe, expect, it } from "vitest";
import { remediaDark, remediaLight } from "./builtIn";
import { mixColors } from "./color";
import { mergeTheme, resolveTheme } from "./resolve";

describe("mergeTheme", () => {
  it("fills missing tokens from the built-in theme with the same appearance", () => {
    const theme = mergeTheme({
      formatVersion: 1,
      id: "amber-light",
      name: "Amber light",
      appearance: "light",
      colors: { accent: "#AA5500" },
    });
    expect(theme.id).toBe("amber-light");
    expect(theme.author).toBeUndefined();
    expect(theme.colors).toEqual({ ...remediaLight.colors, accent: "#AA5500" });
    expect(theme.shape).toEqual(remediaLight.shape);
  });
});

describe("resolveTheme", () => {
  it("validates, merges and derives", () => {
    const result = resolveTheme({ ...remediaDark, colors: { ...remediaDark.colors, text: "nope" } });
    if (!result.ok) throw new Error("expected ok");
    expect(result.warnings).toEqual([{ path: "colors.text", code: "invalid_value" }]);
    expect(result.theme.colors.text).toBe(remediaDark.colors.text);
    expect(result.theme.derived.focusRing).toBe(remediaDark.colors.accentText);
    expect(result.theme.derived.hover).toBe(mixColors(remediaDark.colors.surface, remediaDark.colors.text, 0.06));
  });

  it("passes errors through", () => {
    expect(resolveTheme(null)).toEqual({ ok: false, error: "not_an_object" });
  });
});
