import { useTranslation } from "react-i18next";
import type { MediaRecord, RecordStatus } from "@remedia/core";
import { RecordCard } from "../components/RecordCard";
import { LIBRARY_ORDER } from "../recordTypes";
import { useRecords } from "../useRecords";
import "./LibrariesScreen.css";

interface LibrariesScreenProps {
  onOpenRecord: (record: MediaRecord) => void;
  onSeeAll: (status: RecordStatus) => void;
}

/** The five libraries (one per status) as horizontal shelves. */
export function LibrariesScreen({ onOpenRecord, onSeeAll }: LibrariesScreenProps) {
  const { t } = useTranslation();
  const records = useRecords();

  if (!records) return <p className="screen-placeholder">{t("form.loading")}</p>;

  return (
    <section className="screen">
      <h1>{t("libraries.title")}</h1>
      {LIBRARY_ORDER.map((status) => {
        // listRecords already returns the most recently modified first.
        const shelf = records.filter((r) => r.status === status);
        return (
          <section key={status} className="shelf">
            <header className="shelf-header">
              <h2>
                {t(`libraries.${status}`)} <span className="shelf-count">{shelf.length}</span>
              </h2>
              {shelf.length > 0 && (
                <button type="button" className="link-button" onClick={() => onSeeAll(status)}>
                  {t("libraries.seeAll")}
                </button>
              )}
            </header>
            {shelf.length === 0 ? (
              <p className="screen-placeholder">{t(`libraries.empty.${status}`)}</p>
            ) : (
              <div className="shelf-items">
                {shelf.map((record) => (
                  <RecordCard key={record.id} record={record} onOpen={onOpenRecord} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
