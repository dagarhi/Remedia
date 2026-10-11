import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { fetch } from "@tauri-apps/plugin-http";
import {
  checkCompatibility,
  type HttpClient,
  type Language,
  type Provider,
  type ProviderContext,
  type ProviderCredentials,
} from "@remedia/core";

/** A provider answered with an HTTP error, e.g. 401 when the TMDB key is wrong. */
export class ProviderHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Provider request failed with HTTP ${status}`);
  }
}

async function json(response: Response): Promise<unknown> {
  if (!response.ok) throw new ProviderHttpError(response.status);
  return response.json();
}

/**
 * HTTP through the Tauri HTTP plugin: requests are made by Rust, so providers without
 * browser CORS support work too. Allowed hosts are listed in capabilities/default.json.
 */
const http: HttpClient = {
  getJson: async (url, headers = {}) => json(await fetch(url, { headers: { Accept: "application/json", ...headers } })),
  postJson: async (url, body, headers = {}) =>
    json(
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
        body: JSON.stringify(body),
      }),
    ),
  postText: async (url, body, headers = {}) => json(await fetch(url, { method: "POST", headers, body })),
};

/** credentials.toml, read fresh each time (hand edits apply at once). Throws on a malformed file. */
export function getCredentials(): Promise<ProviderCredentials> {
  return invoke<ProviderCredentials>("get_credentials");
}

export function setCredentials(credentials: ProviderCredentials): Promise<void> {
  return invoke("set_credentials", { credentials });
}

export function credentialsPath(): Promise<string> {
  return invoke<string>("credentials_path");
}

/** Everything an adapter needs for one search or lookup. */
export async function providerContext(language: Language): Promise<ProviderContext> {
  return { http, language, credentials: await getCredentials() };
}

// The app version never changes while running: ask once.
const appVersion = getVersion();

/** True when this app can run the provider package (manifest apiVersion and minAppVersion). */
export async function isCompatible(provider: Provider): Promise<boolean> {
  return checkCompatibility(provider.manifest, await appVersion).ok;
}

/** Downloads a provider poster into the images folder; returns the relative path to store. */
export function importImageUrl(url: string, folder: "covers"): Promise<string> {
  return invoke<string>("import_image_url", { url, folder });
}
