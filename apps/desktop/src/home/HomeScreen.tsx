import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Plus, SlidersHorizontal } from "lucide-react";
import type { HomeBlock, MediaRecord, RecordStatus, Uuid } from "@remedia/core";
import { useSettings } from "../settings/SettingsContext";
import { useRecords } from "../useRecords";
import { HomeEditor } from "./HomeEditor";
import { LibrariesBlock } from "./LibrariesBlock";
import { RandomPickBlock } from "./RandomPickBlock";
import { RecentActivityBlock } from "./RecentActivityBlock";
import "../components/HistoryList.css";
import "../screens/LibrariesScreen.css";
import "./HomeScreen.css";

interface Quote {
  text: string;
  source: string;
}

interface HomeScreenProps {
  onAdd: () => void;
  onOpenRecord: (id: Uuid) => void;
  onOpenLibrary: (status: RecordStatus) => void;
}

/** Personal summary: greeting, quote and the blocks the user turned on, in their order. */
export function HomeScreen({ onAdd, onOpenRecord, onOpenLibrary }: HomeScreenProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const records = useRecords();
  const [editing, setEditing] = useState(false);

  // One quote per visit: the initializer function runs only on the first render.
  const [quoteIndex] = useState(() => Math.random());
  const quotes = t("home.quotes", { returnObjects: true }) as Quote[];
  const quote = quotes[Math.floor(quoteIndex * quotes.length)];

  const name = settings["profile.name"].trim();
  const openRecord = (record: MediaRecord) => onOpenRecord(record.id);

  /** The catalogue: block id -> component. A new block is a new entry here (UI Design). */
  const BLOCKS: Record<HomeBlock, () => ReactNode> = {
    libraries: () => <LibrariesBlock onOpenLibrary={onOpenLibrary} />,
    "random-pick": () => <RandomPickBlock onOpenRecord={openRecord} />,
    "recent-activity": () => <RecentActivityBlock onOpenRecord={onOpenRecord} />,
  };

  return (
    <section className="screen home">
      <header className="home-header">
        <div>
          <h1>{name ? t("home.greetingNamed", { name }) : t("home.greeting")}</h1>
          {quote && (
            <blockquote className="home-quote">
              <p>“{quote.text}”</p>
              <cite>— {quote.source}</cite>
            </blockquote>
          )}
        </div>
        <button type="button" className="button" onClick={() => setEditing((e) => !e)}>
          <SlidersHorizontal size={14} aria-hidden /> {t(editing ? "home.doneEditing" : "home.edit")}
        </button>
      </header>

      {editing && <HomeEditor />}

      {records && records.length === 0 && (
        <div className="home-empty">
          <p>{t("home.emptyMessage")}</p>
          <button type="button" className="button button--primary" onClick={onAdd}>
            <Plus size={16} aria-hidden /> {t("home.addFirst")}
          </button>
        </div>
      )}

      {settings["home.blocks"].map((id) => (
        <section key={id} className="home-block">
          <h2>{t(`home.blocks.${id}`)}</h2>
          {BLOCKS[id]()}
        </section>
      ))}
    </section>
  );
}
