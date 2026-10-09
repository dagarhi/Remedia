import { describe, expect, it } from "vitest";
import { BUILT_IN_THEMES } from "./builtIn";
import { contrastRatio } from "./color";
import { validateThemeFile } from "./validate";

// Accessibility targets from the Themes Spec.
describe.each(Object.values(BUILT_IN_THEMES))("$id", (theme) => {
  const c = theme.colors;

  it("is a valid theme file without warnings (dogfooding)", () => {
    const result = validateThemeFile(JSON.parse(JSON.stringify(theme)));
    expect(result).toMatchObject({ ok: true, warnings: [] });
  });

  it.each(["background", "surface", "surfaceRaised"] as const)("text levels reach 4.5:1 on %s", (bg) => {
    expect(contrastRatio(c.text, c[bg])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.textSecondary, c[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it("controls reach 3:1", () => {
    expect(contrastRatio(c.borderStrong, c.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c.accentText, c.surface)).toBeGreaterThanOrEqual(3);
  });

  it("text on the accent fill reaches 4.5:1", () => {
    expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
