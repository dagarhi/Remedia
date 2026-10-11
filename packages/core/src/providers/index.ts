import { aniList } from "./anilist";
import { googleBooks } from "./googlebooks";
import { igdb } from "./igdb";
import { jikan } from "./jikan";
import { openLibrary } from "./openlibrary";
import { rawg } from "./rawg";
import { tmdb } from "./tmdb";
import { tvmaze } from "./tvmaze";
import type { Provider, ProviderId } from "./types";

export * from "./types";
export { resetIgdbToken } from "./igdb";
export { aniList, googleBooks, igdb, jikan, openLibrary, rawg, tmdb, tvmaze };

/** Every provider the app knows, in the order their chips appear. */
export const PROVIDERS: Provider[] = [tmdb, tvmaze, openLibrary, googleBooks, rawg, igdb, aniList, jikan];

export function providerById(id: ProviderId): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Providers that can fill a template; custom templates have none linked, so all are offered (UI Design). */
export function providersFor(template: string): Provider[] {
  const linked = PROVIDERS.filter((p) => p.templates.includes(template));
  return linked.length > 0 ? linked : PROVIDERS;
}
