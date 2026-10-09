import { describe, expect, it } from "vitest";
import { fromDisplayRating, isValidStoredRating, toDisplayRating } from "./rating";

describe("toDisplayRating", () => {
  it.each([
    [100, "stars_5", 5],
    [80, "stars_5", 4],
    [70, "stars_5", 4],
    [70, "stars_5_half", 3.5],
    [73, "out_of_10", 7],
    [73, "out_of_100", 73],
  ] as const)("%i shows on %s as %f", (stored, scale, shown) => {
    expect(toDisplayRating(stored, scale)).toBe(shown);
  });

  it("never shows a rated record as 0", () => {
    expect(toDisplayRating(1, "stars_5")).toBe(1);
    expect(toDisplayRating(1, "stars_5_half")).toBe(0.5);
  });
});

describe("fromDisplayRating", () => {
  it.each([
    [5, "stars_5", 100],
    [1, "stars_5", 20],
    [3.5, "stars_5_half", 70],
    [0.5, "stars_5_half", 10],
    [7, "out_of_10", 70],
    [73, "out_of_100", 73],
  ] as const)("%f on %s stores %i", (shown, scale, stored) => {
    expect(fromDisplayRating(shown, scale)).toBe(stored);
  });

  it.each([
    [0, "stars_5"],
    [6, "stars_5"],
    [3.5, "stars_5"],
    [101, "out_of_100"],
  ] as const)("rejects %f on %s", (shown, scale) => {
    expect(() => fromDisplayRating(shown, scale)).toThrow(RangeError);
  });

  it("round-trips at the precision of the scale", () => {
    for (const shown of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]) {
      expect(toDisplayRating(fromDisplayRating(shown, "stars_5_half"), "stars_5_half")).toBe(shown);
    }
  });
});

describe("isValidStoredRating", () => {
  it("accepts integers from 1 to 100 only", () => {
    expect([1, 50, 100].every(isValidStoredRating)).toBe(true);
    expect([0, 101, 4.5].some(isValidStoredRating)).toBe(false);
  });
});
