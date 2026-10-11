import { aniList } from "./anilist";
import { openLibrary } from "./openlibrary";
import { tmdb } from "./tmdb";
import type { Provider, ProviderId } from "./types";

export * from "./types";
export { aniList, openLibrary, tmdb };

/** Every provider the app knows. IGDB (video games) is added later. */
export const PROVIDERS: Provider[] = [tmdb, openLibrary, aniList];

export function providerById(id: ProviderId): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Providers that can fill a template; custom templates have none linked, so all are offered (UI Design). */
export function providersFor(template: string): Provider[] {
  const linked = PROVIDERS.filter((p) => p.templates.includes(template));
  return linked.length > 0 ? linked : PROVIDERS;
}
