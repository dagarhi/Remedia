import { useTranslation } from "react-i18next";
import { Library } from "lucide-react";
import type { RecordStatus } from "@remedia/core";
import { Cover } from "../components/Cover";
import { useCovers } from "../images";
import { useSettings } from "../settings/SettingsContext";
import { useRecords } from "../useRecords";

/** "Your libraries": one tile per chosen status, with a collage of its latest covers. */
export function LibrariesBlock({ onOpenLibrary }: { onOpenLibrary: (status: RecordStatus) => void }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const records = useRecords();
  const covers = useCovers();

  if (!records) return null;

  return (
    <div className="library-tiles">
      {settings["home.libraries"].map((status) => {
        const shelf = records.filter((r) => r.status === status);
        // Up to four of the most recently modified records, preferring ones with a cover.
        const preview = [...shelf.filter((r) => covers.has(r.id)), ...shelf.filter((r) => !covers.has(r.id))].slice(0, 4);
        return (
          <button key={status} type="button" className="library-tile" onClick={() => onOpenLibrary(status)}>
            <span className="library-tile-collage" aria-hidden>
              {preview.length === 0 ? (
                <Library size={28} className="library-tile-empty" />
              ) : (
                preview.map((r) => <Cover key={r.id} path={covers.get(r.id)} templateId={r.template} iconSize={20} />)
              )}
            </span>
            <span className="library-tile-name">{t(`libraries.${status}`)}</span>
            <span className="library-tile-count">{t("home.recordCount", { count: shelf.length })}</span>
          </button>
        );
      })}
    </div>
  );
}
