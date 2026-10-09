/**
 * Normalises text for comparisons (tag names, identity fields): lowercase, trimmed,
 * inner whitespace collapsed and accents removed. "ñ" is a letter in Spanish, not an
 * accented "n", so it is kept: "año" and "ano" stay different.
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/ñ/g, "\u0000")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\u0000/g, "ñ");
}
