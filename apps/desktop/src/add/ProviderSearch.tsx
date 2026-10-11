import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import {
  isConfigured,
  linkedExternalIds,
  providersFor,
  type Provider,
  type ProviderId,
  type SearchResult,
  type Uuid,
} from "@remedia/core";
import { iconForType } from "../recordTypes";
import { data } from "../db/database";
import { getCredentials, providerContext, ProviderHttpError } from "../providers";
import { useSettings } from "../settings/SettingsContext";
import { systemLanguage } from "../i18n";

interface ProviderSearchProps {
  templateId: string;
  onPick: (provider: Provider, result: SearchResult) => void;
  /** Continue to the empty form, keeping what was typed as the title. */
  onManual: (title: string) => void;
  onOpenExisting: (id: Uuid) => void;
  onOpenSettings: () => void;
}

type Status = { kind: "idle" } | { kind: "searching" } | { kind: "done" } | { kind: "error"; code: string };

/** Automatic mode: provider chips above a title search; results link to the form (UI Design, add flow). */
export function ProviderSearch({ templateId, onPick, onManual, onOpenExisting, onOpenSettings }: ProviderSearchProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const language = settings.language === "system" ? systemLanguage() : settings.language;

  // Providers linked to this type that can be used now (keyless, or with a key configured).
  const [usable, setUsable] = useState<Provider[] | null>(null);
  const [selected, setSelected] = useState<Set<ProviderId>>(new Set());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ provider: Provider; result: SearchResult }[]>([]);
  const [existing, setExisting] = useState<Map<string, Uuid>>(new Map());
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Services that failed in the last search while others answered.
  const [failed, setFailed] = useState<Provider[]>([]);

  useEffect(() => {
    getCredentials()
      .then((credentials) => providersFor(templateId).filter((p) => isConfigured(p, credentials)))
      // A malformed credentials file never blocks searching with the keyless providers.
      .catch(() => providersFor(templateId).filter((p) => !p.credentials))
      .then((list) => {
        setUsable(list);
        setSelected(new Set(list.map((p) => p.id)));
      });
  }, [templateId]);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim() === "" || !usable) return;
    setStatus({ kind: "searching" });
    try {
      const ctx = await providerContext(language);
      const chosen = usable.filter((p) => selected.has(p.id));
      // Each service answers on its own: one that is down never hides the others' results.
      const outcomes = await Promise.allSettled(
        chosen.map(async (provider) =>
          (await provider.search(ctx, templateId, query.trim())).map((result) => ({ provider, result })),
        ),
      );
      const failedProviders = chosen.filter((_, i) => outcomes[i].status === "rejected");
      if (failedProviders.length === chosen.length) {
        // Every service failed: report it like a single failure.
        throw (outcomes[0] as PromiseRejectedResult).reason;
      }
      setFailed(failedProviders);
      const all = outcomes.flatMap((o) => (o.status === "fulfilled" ? o.value : []));
      // Results already in the library are marked (same external link, data model).
      const found = new Map<string, Uuid>();
      for (const linkProvider of new Set(all.map((r) => r.result.linkProvider))) {
        const ids = all.filter((r) => r.result.linkProvider === linkProvider).map((r) => r.result.externalId);
        for (const [id, recordId] of await linkedExternalIds(data, linkProvider, ids)) found.set(`${linkProvider}:${id}`, recordId);
      }
      setExisting(found);
      setResults(all);
      setStatus({ kind: "done" });
    } catch (error) {
      setStatus({ kind: "error", code: error instanceof ProviderHttpError && error.status === 401 ? "unauthorized" : "failed" });
    }
  }

  if (!usable) return <p className="screen-placeholder">{t("form.loading")}</p>;

  // No usable provider for this type: explain, link to Settings, offer manual (UI Design).
  if (usable.length === 0) {
    return (
      <div className="search-notice">
        <p>{t("search.noProvider")}</p>
        <div className="search-notice-actions">
          <button type="button" className="button" onClick={onOpenSettings}>
            {t("search.openServices")}
          </button>
          <button type="button" className="button button--primary" onClick={() => onManual("")}>
            {t("search.continueManually")}
          </button>
        </div>
      </div>
    );
  }

  const Icon = iconForType(templateId);

  return (
    <div className="provider-search">
      <div className="provider-chips">
        {usable.map((p) => (
          <label key={p.id} className="provider-chip">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  return next;
                })
              }
            />
            {t(`providers.${p.id}.name`)}
          </label>
        ))}
      </div>

      <form className="search-box" onSubmit={search}>
        <input
          autoFocus
          value={query}
          placeholder={t("search.placeholder")}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="button button--primary" disabled={status.kind === "searching" || selected.size === 0}>
          <Search size={16} aria-hidden /> {t(status.kind === "searching" ? "search.searching" : "search.search")}
        </button>
      </form>

      {status.kind === "error" && <p className="form-error">{t(`search.errors.${status.code}`)}</p>}
      {status.kind === "done" && failed.length > 0 && (
        <p className="screen-placeholder">
          {t("search.partialFailure", { services: failed.map((p) => t(`providers.${p.id}.name`)).join(", ") })}
        </p>
      )}

      {status.kind === "done" && results.length === 0 && <p className="screen-placeholder">{t("search.noResults")}</p>}

      {results.length > 0 && (
        <ul className="search-results">
          {results.map(({ provider, result }) => {
            const existingId = existing.get(`${result.linkProvider}:${result.externalId}`);
            return (
              <li key={`${result.linkProvider}:${result.externalId}`}>
                <button
                  type="button"
                  className="search-result"
                  onClick={() => (existingId ? onOpenExisting(existingId) : onPick(provider, result))}
                >
                  {/* Search results are temporary, so the remote thumbnail is fine here; saved covers are local. */}
                  <span className="search-result-cover cover">
                    {result.posterUrl ? <img src={result.posterUrl} alt="" /> : <Icon size={20} aria-hidden />}
                  </span>
                  <span className="search-result-text">
                    <span className="search-result-title">
                      {result.title} {result.year && <span className="search-result-year">({result.year})</span>}
                    </span>
                    {result.originalTitle && result.originalTitle !== result.title && (
                      <span className="search-result-extra">{result.originalTitle}</span>
                    )}
                    {result.extra && <span className="search-result-extra">{result.extra}</span>}
                  </span>
                  <span className="search-result-side">
                    {existingId && <span className="tag">{t("search.alreadyInLibrary")}</span>}
                    <span className="search-result-provider">{t(`providers.${provider.id}.name`)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="link-button" onClick={() => onManual(query.trim())}>
        {t("search.notListed")}
      </button>
    </div>
  );
}
