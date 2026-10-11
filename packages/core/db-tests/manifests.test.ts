import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDERS } from "../src/providers";
import {
  checkCompatibility,
  parseProviderManifest,
  PROVIDER_API_VERSION,
  providerManifestJsonSchema,
  type ProviderManifest,
} from "../src/providers/manifest";

// Lives in db-tests because it reads and writes a file (Node only).
const SCHEMA_FILE = join(import.meta.dirname, "..", "src", "providers", "provider-manifest.schema.json");

const base: ProviderManifest = {
  id: "remedia.provider.example",
  kind: "provider",
  name: "Example",
  version: "1.0.0",
  apiVersion: 1,
  minAppVersion: "0.1.0",
  author: "Remedia",
  recordTypes: ["book"],
  capabilities: ["metadata.search"],
};

describe("first-party provider manifests", () => {
  it.each(PROVIDERS.map((p) => [p.id, p] as const))("%s has a valid manifest matching its id", (id, provider) => {
    expect(provider.manifest.id).toBe(`remedia.provider.${id}`);
    expect(provider.manifest.apiVersion).toBe(PROVIDER_API_VERSION);
    expect(checkCompatibility(provider.manifest, "0.1.0")).toEqual({ ok: true });
  });

  it("keep the credentials.toml sections the app already uses", () => {
    const sections = Object.fromEntries(PROVIDERS.filter((p) => p.manifest.settings).map((p) => [p.id, p.manifest.settings!.section]));
    expect(sections).toEqual({ tmdb: "tmdb", googlebooks: "google_books", rawg: "rawg", igdb: "igdb" });
  });

  it("declare seasons only where the adapter returns them", () => {
    expect(PROVIDERS.filter((p) => p.manifest.capabilities.includes("seasons")).map((p) => p.id)).toEqual(["tmdb", "tvmaze"]);
  });
});

describe("parseProviderManifest", () => {
  it.each([
    ["an unknown capability", { ...base, capabilities: ["teleport"] }],
    ["a bad version", { ...base, version: "1.0" }],
    ["an unknown key", { ...base, extra: true }],
    ["a bad id", { ...base, id: "TMDB" }],
  ])("rejects %s", (_, json) => {
    expect(() => parseProviderManifest(json)).toThrow();
  });
});

describe("checkCompatibility", () => {
  it("disables packages for a newer contract or a newer app", () => {
    expect(checkCompatibility({ ...base, apiVersion: PROVIDER_API_VERSION + 1 }, "9.9.9")).toEqual({ ok: false, reason: "newer_api" });
    expect(checkCompatibility({ ...base, minAppVersion: "0.10.0" }, "0.9.5")).toEqual({ ok: false, reason: "newer_app" });
    expect(checkCompatibility({ ...base, minAppVersion: "0.10.0" }, "0.10.0")).toEqual({ ok: true });
  });
});

describe("provider-manifest.schema.json", () => {
  // Run with UPDATE_SCHEMAS=1 to regenerate the file after changing the Zod schema.
  it("is generated from the Zod schema and up to date", () => {
    const expected = JSON.stringify(providerManifestJsonSchema(), null, 2) + "\n";
    if (process.env.UPDATE_SCHEMAS) writeFileSync(SCHEMA_FILE, expected);
    expect(readFileSync(SCHEMA_FILE, "utf8").replace(/\r\n/g, "\n")).toBe(expected);
  });
});
