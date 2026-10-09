import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import type { MediaRecord, RecordStatus } from "@remedia/core";
import { RecordCard } from "../components/RecordCard";
import { useRecords } from "../useRecords";
import "./LibrariesScreen.css";

interface LibraryScreenProps {
  status: RecordStatus;
  onOpenRecord: (record: MediaRecord) => void;
  onBack: () => void;
}

/**
 * "See all": every record of one status. Search, sort, filters and views
 * from the UI Design come in a later step.
 */
export function LibraryScreen({ status, onOpenRecord, onBack }: LibraryScreenProps) {
  const { t } = useTranslation();
  const records = useRecords({ status });

  return (
    <section className="screen">
      <button type="button" className="link-button back-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> {t("libraries.title")}
      </button>
      <h1>
        {t(`libraries.${status}`)} {records && <span className="shelf-count">{records.length}</span>}
      </h1>
      {!records ? (
        <p className="screen-placeholder">{t("form.loading")}</p>
      ) : records.length === 0 ? (
        <p className="screen-placeholder">{t(`libraries.empty.${status}`)}</p>
      ) : (
        <div className="library-grid">
          {records.map((record) => (
            <RecordCard key={record.id} record={record} onOpen={onOpenRecord} />
          ))}
        </div>
      )}
    </section>
  );
}
