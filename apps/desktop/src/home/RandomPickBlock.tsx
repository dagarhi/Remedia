import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Shuffle } from "lucide-react";
import type { MediaRecord } from "@remedia/core";
import { RecordCard } from "../components/RecordCard";
import { useCovers } from "../images";
import { useRecords } from "../useRecords";

/** "What should I watch today?": picks a random record from Pending. */
export function RandomPickBlock({ onOpenRecord }: { onOpenRecord: (record: MediaRecord) => void }) {
  const { t } = useTranslation();
  const pending = useRecords({ status: "planned" });
  const covers = useCovers();
  const [pick, setPick] = useState<MediaRecord | null>(null);

  if (!pending) return null;
  if (pending.length === 0) return <p className="screen-placeholder">{t("home.randomPick.empty")}</p>;

  function surprise() {
    if (!pending || pending.length === 0) return;
    // Avoid showing the same record twice in a row when there is a choice.
    const options = pending.length > 1 ? pending.filter((r) => r.id !== pick?.id) : pending;
    setPick(options[Math.floor(Math.random() * options.length)]);
  }

  return (
    <div className="random-pick">
      <button type="button" className="button button--primary" onClick={surprise}>
        <Shuffle size={16} aria-hidden /> {t(pick ? "home.randomPick.again" : "home.randomPick.button")}
      </button>
      {pick && <RecordCard record={pick} cover={covers.get(pick.id)} onOpen={onOpenRecord} />}
    </div>
  );
}
