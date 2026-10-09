import type { HexColor } from "./types";

type Rgb = [number, number, number];

function parseHex(color: HexColor): Rgb {
  const n = Number.parseInt(color.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function toHex([r, g, b]: Rgb): HexColor {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Paints `overlay` over `base` at `amount` opacity (0 to 1). */
export function mixColors(base: HexColor, overlay: HexColor, amount: number): HexColor {
  const a = parseHex(base);
  const b = parseHex(overlay);
  return toHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount) as Rgb);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(color: HexColor): number {
  const [r, g, b] = parseHex(color).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: HexColor, b: HexColor): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Black or white, whichever reads better on `background` (e.g. text on a record type colour). */
export function readableTextOn(background: HexColor): HexColor {
  return contrastRatio(background, "#000000") >= contrastRatio(background, "#FFFFFF") ? "#000000" : "#FFFFFF";
}
