import { describe, expect, it } from "vitest";
import { formatRating } from "./rating";
import { isValidSettingValue, ratingScaleFor, SETTING_DEFAULTS } from "./settings";

describe("isValidSettingValue", () => {
  it.each([
    ["language", "es", true],
    ["language", "system", true],
    ["language", "fr", false],
    ["theme.mode", "dark", true],
    ["theme.mode", "sepia", false],
    ["rating_display.default", "out_of_10", true],
    ["rating_display.default", "default", false],
    ["rating_display.movie", "default", true],
    ["rating_display.movie", "stars_5_half", true],
    ["unknown.key", "x", false],
  ])("%s = %s is %s", (key, value, valid) => {
    expect(isValidSettingValue(key, value)).toBe(valid);
  });
});

describe("ratingScaleFor", () => {
  it("uses the type's own scale, or the global default", () => {
    const settings = { ...SETTING_DEFAULTS, "rating_display.movie": "out_of_10" as const, "rating_display.book": "default" as const };
    expect(ratingScaleFor(settings, "movie")).toBe("out_of_10");
    expect(ratingScaleFor(settings, "book")).toBe("stars_5");
    expect(ratingScaleFor(settings, "game")).toBe("stars_5");
  });
});

describe("formatRating", () => {
  it.each([
    [80, "stars_5", "★★★★"],
    [70, "stars_5_half", "★★★½"],
    [73, "out_of_10", "7/10"],
    [73, "out_of_100", "73/100"],
  ] as const)("%i on %s is %s", (stored, scale, text) => {
    expect(formatRating(stored, scale)).toBe(text);
  });
});
