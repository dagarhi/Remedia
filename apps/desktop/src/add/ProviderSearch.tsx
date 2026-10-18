import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import {
  isConfigured,
  linkedExternalIds,
  providersFor,
  type Provider,
  type ProviderContext,
  type ProviderId,
  type SearchResult,
  type Uuid,
} from "@remedia/core";
import { iconForType } from "../recordTypes";
import { data } from "../db/database";
import { getCredentials, isCompatible, providerContext, ProviderHttpError } from "../providers";
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

/** i18n key under `search.errors` for a failed search. */
const errorCode = (error: unknown) =>
  error instanceof ProviderHttpError && error.status === 401 ? "unauthorized" : "failed";

/** Hits already in the library (same external link, data model), as `linkProvider:id` -> record id. */
async function alreadyInLibrary(hits: SearchResult[]): Promise<Map<string, Uuid>> {
  const found = new Map<string, Uuid>();
  for (const linkProvider of new Set(hits.map((hit) => hit.linkProvider))) {
    const ids = hits.filter((hit) => hit.linkProvider === linkProvider).map((hit) => hit.externalId);
    for (const [id, recordId] of await linkedExternalIds(data, linkProvider, ids)) found.set(`${linkProvider}:${id}`, recordId);
  }
  return found;
}

/** Automatic mode: provider chips above a title search; results link to the form (UI Design, add flow). */
export function ProviderSearch({ templateId, onPick, onManual, onOpenExisting, onOpenSettings }: ProviderSearchProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const language = settings.language === "system" ? systemLanguage() : settings.language;

  // Providers linked to this type that can be used now (keyless, or with a key configured).
  const [usable, setUsable] = useState<Provider[] | null>(null);
  const [selected, setSelected] = useState<Set<ProviderId>>(new Set());
  const [query, setQuery] = useState("");
  // Each service's hits, filled in as it answers.
  const [resultsBy, setResultsBy] = useState<Partial<Record<ProviderId, SearchResult[]>>>({});
  const [existing, setExisting] = useState<Map<string, Uuid>>(new Map());
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Services the current search is still waiting for, and those that failed.
  const [pending, setPending] = useState<Provider[]>([]);
  const [failed, setFailed] = useState<Provider[]>([]);
  // Numbers each search, so answers that arrive after a newer search started are ignored.
  const searchRun = useRef(0);

  useEffect(() => {
    async function load() {
      const candidates = providersFor(templateId);
      // Incompatible packages (newer contract or app) are skipped, never fatal.
      const compatible = (await Promise.all(candidates.map(isCompatible))).map((ok, i) => (ok ? candidates[i] : null));
      const credentials = await getCredentials().catch(() => null);
      return compatible.filter((p): p is Provider =>
        // A malformed credentials file never blocks searching with the keyless providers.
        p !== null && (credentials ? isConfigured(p, credentials) : !p.manifest.settings),
      );
    }
    load().then((list) => {
      setUsable(list);
      setSelected(new Set(list.map((p) => p.id)));
    });
  }, [templateId]);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim() === "" || !usable) return;
    const run = ++searchRun.current;
    const isCurrent = () => searchRun.current === run;
    const text = query.trim();
    const chosen = usable.filter((p) => selected.has(p.id));

    setStatus({ kind: "searching" });
    setResultsBy({});
    setExisting(new Map());
    setPending(chosen);
    setFailed([]);

    let ctx: ProviderContext;
    try {
      ctx = await providerContext(language);
    } catch (error) {
      setStatus({ kind: "error", code: errorCode(error) });
      return;
    }

    // Each service answers on its own and its results show at once: a slow or broken
    // service never holds back or hides the others.
    const errors: unknown[] = [];
    await Promise.all(
      chosen.map(async (provider) => {
        try {
          const hits = await provider.search(ctx, templateId, text);
          const found = await alreadyInLibrary(hits);
          if (!isCurrent()) return;
          setExisting((current) => new Map([...current, ...found]));
          setResultsBy((current) => ({ ...current, [provider.id]: hits }));
        } catch (error) {
          errors.push(error);
          if (isCurrent()) setFailed((current) => [...current, provider]);
        } finally {
          if (isCurrent()) setPending((current) => current.filter((p) => p !== provider));
        }
      }),
    );

    if (!isCurrent()) return;
    // Every service failed: report it like a single failure.
    setStatus(errors.length === chosen.length ? { kind: "error", code: errorCode(errors[0]) } : { kind: "done" });
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
  // Always in chip order, whichever service answered first.
  const results = usable.flatMap((provider) => (resultsBy[provider.id] ?? []).map((result) => ({ provider, result })));
  const names = (providers: Provider[]) => providers.map((p) => t(`providers.${p.id}.name`)).join(", ");

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

      {status.kind === "searching" && pending.length > 0 && (
        <p className="screen-placeholder" role="status">
          {t("search.waitingFor", { services: names(pending) })}
        </p>
      )}
      {status.kind === "error" && <p className="form-error">{t(`search.errors.${status.code}`)}</p>}
      {status.kind !== "error" && failed.length > 0 && (
        <p className="screen-placeholder">{t("search.partialFailure", { services: names(failed) })}</p>
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
