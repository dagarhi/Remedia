import { describe, expect, it } from "vitest";
import { contrastRatio, mixColors, readableTextOn } from "./color";

describe("mixColors", () => {
  it("returns the base at 0 and the overlay at 1", () => {
    expect(mixColors("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mixColors("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
  });

  it("mixes proportionally", () => {
    expect(mixColors("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for equal colours", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21);
    expect(contrastRatio("#D9A25F", "#D9A25F")).toBeCloseTo(1);
  });
});

describe("readableTextOn", () => {
  it("picks black on light colours and white on dark ones", () => {
    expect(readableTextOn("#FFEE88")).toBe("#000000");
    expect(readableTextOn("#1C1916")).toBe("#FFFFFF");
  });
});
