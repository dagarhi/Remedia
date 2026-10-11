import { parseProviderManifest } from "../manifest";
import manifest from "./manifest.json";
import { credential, queryString, unique, type Provider, type ProviderContext, type SearchResult } from "../types";

/*
 * IGDB: video games, through Twitch. Needs a Twitch application's client ID and secret,
 * which are exchanged for an access token (cached until it expires).
 */

const API = "https://api.igdb.com/v4";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const COVERS = "https://images.igdb.com/igdb/image/upload/t_cover_big";

type Json = Record<string, any>;

let cachedToken: { clientId: string; token: string; expiresAt: number } | null = null;

/** Clears the cached token (tests, or after the keys change). */
export function resetIgdbToken() {
  cachedToken = null;
}

async function accessToken(ctx: ProviderContext, clientId: string, secret: string): Promise<string> {
  if (cachedToken && cachedToken.clientId === clientId && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const response = (await ctx.http.postText(
    `${TOKEN_URL}?${queryString({ client_id: clientId, client_secret: secret, grant_type: "client_credentials" })}`,
    "",
  )) as Json;
  // Renew a minute early, so a token never expires in the middle of a search.
  cachedToken = { clientId, token: response.access_token, expiresAt: Date.now() + (response.expires_in - 60) * 1000 };
  return cachedToken.token;
}

const FIELDS =
  "name,first_release_date,summary,cover.image_id,platforms.name,genres.name," +
  "involved_companies.company.name,involved_companies.developer,involved_companies.publisher";

/** "2017-03-02" from a Unix time in seconds. */
const dateOf = (seconds: number | undefined) => (seconds ? new Date(seconds * 1000).toISOString().slice(0, 10) : undefined);

const companies = (game: Json, role: "developer" | "publisher") =>
  unique((game.involved_companies ?? []).filter((c: Json) => c[role]).map((c: Json) => c.company?.name));

export const igdb: Provider = {
  id: "igdb",
  manifest: parseProviderManifest(manifest),

  async search(ctx, _template, query) {
    const clientId = credential(ctx.credentials, "igdb", "client_id");
    const token = await accessToken(ctx, clientId, credential(ctx.credentials, "igdb", "client_secret"));
    // IGDB queries are a small text language; quotes in the title are escaped.
    const body = `search "${query.replace(/"/g, '\\"')}"; fields ${FIELDS}; limit 20;`;
    const games = (await ctx.http.postText(`${API}/games`, body, {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    })) as Json[];
    return (games ?? []).map(
      (g): SearchResult => ({
        provider: "igdb",
        linkProvider: "igdb",
        externalId: String(g.id),
        title: g.name,
        originalTitle: null,
        year: dateOf(g.first_release_date)?.slice(0, 4) ?? null,
        extra: unique((g.platforms ?? []).map((p: Json) => p.name), 3).join(", ") || null,
        posterUrl: g.cover?.image_id ? `${COVERS}/${g.cover.image_id}.jpg` : null,
        hints: g,
      }),
    );
  },

  // The search asks for every field already, so no second request.
  async details(_ctx, _template, result) {
    const g = (result.hints ?? {}) as Json;
    return {
      values: {
        title: g.name ?? result.title,
        fields: {
          release_date: dateOf(g.first_release_date),
          developers: companies(g, "developer"),
          publishers: companies(g, "publisher"),
          platforms: unique((g.platforms ?? []).map((p: Json) => p.name)),
          genres: unique((g.genres ?? []).map((x: Json) => x.name)),
          synopsis: g.summary || undefined,
        },
      },
      links: [{ provider: "igdb", external_id: result.externalId }],
      posterUrl: result.posterUrl,
    };
  },
};
