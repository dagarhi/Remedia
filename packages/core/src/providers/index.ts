import { aniList } from "./anilist";
import { googleBooks } from "./googlebooks";
import { igdb } from "./igdb";
import { jikan } from "./jikan";
import { openLibrary } from "./openlibrary";
import { rawg } from "./rawg";
import { tmdb } from "./tmdb";
import { tvmaze } from "./tvmaze";
import { hasCapability, type Provider, type ProviderId } from "./types";

export * from "./manifest";
export * from "./types";
export { resetIgdbToken } from "./igdb";
export { aniList, googleBooks, igdb, jikan, openLibrary, rawg, tmdb, tvmaze };

/** Every provider the app knows, in the order their chips appear. */
export const PROVIDERS: Provider[] = [tmdb, tvmaze, openLibrary, googleBooks, rawg, igdb, aniList, jikan];

export function providerById(id: ProviderId): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/**
 * Providers that can search for a template (capability `metadata.search`). Custom templates
 * have none linked, so every searching provider is offered (UI Design).
 */
export function providersFor(template: string): Provider[] {
  const searching = PROVIDERS.filter((p) => hasCapability(p, "metadata.search"));
  const linked = searching.filter((p) => p.manifest.recordTypes.includes(template));
  return linked.length > 0 ? linked : searching;
}
