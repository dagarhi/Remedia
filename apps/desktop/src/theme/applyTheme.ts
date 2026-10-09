import type { ResolvedTheme } from "@remedia/core";

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

const px = (value: number) => `${value}px`;

/** Quotes font names so stacks like ["Inter Display", "sans-serif"] stay valid CSS. */
function fontStack(fonts: string[]): string {
  const generic = new Set(["serif", "sans-serif", "monospace", "system-ui", "cursive", "fantasy"]);
  return fonts.map((f) => (generic.has(f) ? f : `"${f}"`)).join(", ");
}

/** Converts a resolved theme into CSS custom properties, e.g. `--accent-text`. */
export function themeToCssVariables(theme: ResolvedTheme): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [token, value] of Object.entries(theme.colors)) vars[`--${kebab(token)}`] = value;
  for (const [token, value] of Object.entries(theme.derived)) vars[`--${kebab(token)}`] = value;

  vars["--font-heading"] = fontStack(theme.typography.heading);
  vars["--font-body"] = fontStack(theme.typography.body);
  vars["--label-case"] = theme.typography.labelCase === "uppercase" ? "uppercase" : "none";

  const { radiusControl, radiusCard, radiusCover, radiusTag, borderWidth, shadowRaised } = theme.shape;
  vars["--radius-control"] = px(radiusControl);
  vars["--radius-card"] = px(radiusCard);
  vars["--radius-cover"] = px(radiusCover);
  vars["--radius-tag"] = radiusTag === "full" ? "9999px" : px(radiusTag);
  vars["--border-width"] = px(borderWidth);
  vars["--shadow-raised"] = shadowRaised;

  return vars;
}

/** Writes the theme on the root element. Switching theme rewrites the variables; no component re-renders. */
export function applyTheme(theme: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(themeToCssVariables(theme))) {
    root.style.setProperty(name, value);
  }
  // Lets native controls (scrollbars, inputs) match the theme.
  root.style.colorScheme = theme.appearance;
}
