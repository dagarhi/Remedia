import { describe, expect, it } from "vitest";
import { normalizeTagName } from "./tag";
import { normalizeText } from "./text";

describe("normalizeText", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalizeText("  Science   Fiction ")).toBe("science fiction");
  });

  it("removes accents", () => {
    expect(normalizeText("Ciencia Ficción")).toBe("ciencia ficcion");
    expect(normalizeText("Amélie")).toBe("amelie");
  });

  it("keeps ñ as its own letter", () => {
    expect(normalizeText("AÑO")).toBe("año");
    expect(normalizeText("año")).not.toBe(normalizeText("ano"));
  });
});

describe("normalizeTagName", () => {
  it("makes variants of the same tag equal", () => {
    expect(normalizeTagName("Favoritos ")).toBe(normalizeTagName("favoritos"));
  });
});
