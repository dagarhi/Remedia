import { z } from "zod";

/*
 * Provider manifest (first-party-packages.md): what a provider package is and what it can do,
 * as plain JSON. Validated with Zod, which also generates its JSON Schema, like theme files.
 */

/** Version of the provider contract this app implements. A manifest asking for a newer one is disabled. */
export const PROVIDER_API_VERSION = 1;

/**
 * What a provider can do. The app only offers a provider where its capabilities fit
 * (e.g. searching needs `metadata.search`). `quotes` is reserved for the future.
 */
export const PROVIDER_CAPABILITIES = ["metadata.search", "metadata.details", "images", "seasons", "quotes"] as const;
export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

const semver = z.string().regex(/^\d+\.\d+\.\d+$/);

export const providerManifestSchema = z
  .object({
    $schema: z.string().optional(),
    /** Package id, reverse-domain: "remedia.provider.tmdb". */
    id: z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/),
    kind: z.literal("provider"),
    /** Brand name, never translated. */
    name: z.string().min(1),
    version: semver,
    apiVersion: z.int().positive(),
    minAppVersion: semver,
    author: z.string().min(1),
    homepage: z.url().optional(),
    /** Template ids it can fill. */
    recordTypes: z.array(z.string().min(1)).min(1),
    capabilities: z.array(z.enum(PROVIDER_CAPABILITIES)).min(1),
    /** Its keys in credentials.toml; absent when it needs none. */
    settings: z
      .object({
        section: z.string().regex(/^[a-z0-9_]+$/),
        fields: z
          .array(z.object({ key: z.string().regex(/^[a-z0-9_]+$/), type: z.enum(["secret", "text"]), required: z.boolean() }))
          .min(1),
      })
      .optional(),
  })
  .strict();

export type ProviderManifest = z.infer<typeof providerManifestSchema>;

/** Parses a manifest; throws with Zod's message when it is invalid (a bug in a first-party package). */
export function parseProviderManifest(json: unknown): ProviderManifest {
  return providerManifestSchema.parse(json);
}

/** JSON Schema of a provider manifest, for editors and future package authors. */
export function providerManifestJsonSchema() {
  return z.toJSONSchema(providerManifestSchema);
}

/** "1.2.3" -> [1, 2, 3] */
const parts = (version: string) => version.split(".").map(Number);

/** True when `a` is the same as or newer than `b`. */
function atLeast(a: string, b: string): boolean {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return true;
}

export type Compatibility = { ok: true } | { ok: false; reason: "newer_api" | "newer_app" };

/** Whether this app can run a provider package; incompatible ones are disabled, never fatal. */
export function checkCompatibility(manifest: ProviderManifest, appVersion: string): Compatibility {
  if (manifest.apiVersion > PROVIDER_API_VERSION) return { ok: false, reason: "newer_api" };
  if (!atLeast(appVersion, manifest.minAppVersion)) return { ok: false, reason: "newer_app" };
  return { ok: true };
}
