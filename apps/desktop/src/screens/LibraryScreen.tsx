import { useTranslation } from "react-i18next";
import { ArrowLeft, LayoutGrid, List, Search } from "lucide-react";
import {
  groupByTemplate,
  LIBRARY_SORTS,
  queryLibrary,
  type LibrarySort,
  type MediaRecord,
  type RecordStatus,
} from "@remedia/core";
import { RecordCard } from "../components/RecordCard";
import { RecordRow } from "../components/RecordRow";
import { Select } from "../components/Select";
import { useCovers } from "../images";
import { useSeasonsByParent } from "../progress";
import { RECORD_TYPES } from "../recordTypes";
import { useRecords } from "../useRecords";
import { useSessionState } from "../useSessionState";
import "./LibrariesScreen.css";
import "./LibraryScreen.css";

interface LibraryScreenProps {
  status: RecordStatus;
  onOpenRecord: (record: MediaRecord) => void;
  onBack: () => void;
}

type View = "grid" | "list";

/** Display order of the type groups and chips: the order of the add flow. */
const TYPE_ORDER = RECORD_TYPES.map((t) => t.id);

/**
 * "See all" (UI Design): every record of one status, with search, sort, type filter,
 * grid or list view and grouping by type. Options are kept per library for the session.
 */
export function LibraryScreen({ status, onOpenRecord, onBack }: LibraryScreenProps) {
  const { t } = useTranslation();
  const records = useRecords({ status });
  const covers = useCovers();
  const seasons = useSeasonsByParent();

  // One set of options per library (status), remembered until the app restarts.
  const [search, setSearch] = useSessionState(`library.${status}.search`, "");
  const [sort, setSort] = useSessionState<LibrarySort>(`library.${status}.sort`, "modified");
  const [view, setView] = useSessionState<View>(`library.${status}.view`, "grid");
  const [grouped, setGrouped] = useSessionState(`library.${status}.grouped`, true);
  const [types, setTypes] = useSessionState<string[]>(`library.${status}.types`, []);

  if (!records) return <p className="screen-placeholder">{t("form.loading")}</p>;

  // Chips only for types that have records in this library.
  const presentTypes = TYPE_ORDER.filter((id) => records.some((r) => r.template === id));
  const shown = queryLibrary(records, { search, sort, templates: types });
  const groups = grouped ? groupByTemplate(shown, TYPE_ORDER) : [{ template: null, records: shown }];

  function toggleType(id: string) {
    setTypes(types.includes(id) ? types.filter((x) => x !== id) : [...types, id]);
  }

  const renderRecords = (list: MediaRecord[]) =>
    view === "grid" ? (
      <div className="library-grid">
        {list.map((r) => (
          <RecordCard key={r.id} record={r} cover={covers.get(r.id)} seasons={seasons.get(r.id)} onOpen={onOpenRecord} />
        ))}
      </div>
    ) : (
      <div className="library-list">
        {list.map((r) => (
          <RecordRow key={r.id} record={r} cover={covers.get(r.id)} seasons={seasons.get(r.id)} onOpen={onOpenRecord} />
        ))}
      </div>
    );

  return (
    <section className="screen">
      <button type="button" className="link-button back-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> {t("libraries.title")}
      </button>
      <h1>
        {t(`libraries.${status}`)} <span className="shelf-count">{records.length}</span>
      </h1>

      {records.length === 0 ? (
        <p className="screen-placeholder">{t(`libraries.empty.${status}`)}</p>
      ) : (
        <>
          <div className="library-toolbar">
            <label className="library-search">
              <Search size={16} aria-hidden />
              <input
                value={search}
                placeholder={t("library.search")}
                aria-label={t("library.search")}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <Select aria-label={t("library.sortBy")} value={sort} onChange={(e) => setSort(e.target.value as LibrarySort)}>
              {LIBRARY_SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`library.sorts.${s}`)}
                </option>
              ))}
            </Select>

            <label className="library-toggle">
              <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
              {t("library.groupByType")}
            </label>

            {/* Grid or list: two buttons acting as one switch. */}
            <span className="library-view-switch" role="group" aria-label={t("library.view")}>
              <button
                type="button"
                className="icon-button"
                aria-label={t("library.grid")}
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={t("library.list")}
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List size={16} aria-hidden />
              </button>
            </span>
          </div>

          {presentTypes.length > 1 && (
            <div className="library-chips">
              <button type="button" className="library-chip" aria-pressed={types.length === 0} onClick={() => setTypes([])}>
                {t("library.allTypes")}
              </button>
              {presentTypes.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="library-chip"
                  aria-pressed={types.includes(id)}
                  onClick={() => toggleType(id)}
                >
                  {t(`types.${id}`)}
                </button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <p className="screen-placeholder">{t("library.noMatch")}</p>
          ) : (
            groups.map((group) => (
              <section key={group.template ?? "all"} className="library-group">
                {group.template && (
                  <h2>
                    {t(`types.${group.template}`)} <span className="shelf-count">{group.records.length}</span>
                  </h2>
                )}
                {renderRecords(group.records)}
              </section>
            ))
          )}
        </>
      )}
    </section>
  );
}
