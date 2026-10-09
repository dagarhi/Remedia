import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookImage, BookOpen, Film, Gamepad2, Sparkles, SquarePlus, Tv, type LucideIcon } from "lucide-react";
import type { MediaRecord } from "@remedia/core";
import { RecordForm } from "../components/RecordForm";
import { TypeCard } from "../components/TypeCard";
import "./AddScreen.css";

interface TypeOption {
  /** Template id; also the i18n key under `types.` */
  id: string;
  icon: LucideIcon;
  /** Only movies are available in the first roadmap phase. */
  enabled: boolean;
}

const TYPES: TypeOption[] = [
  { id: "movie", icon: Film, enabled: true },
  { id: "series", icon: Tv, enabled: false },
  { id: "book", icon: BookOpen, enabled: false },
  { id: "game", icon: Gamepad2, enabled: false },
  { id: "anime", icon: Sparkles, enabled: false },
  { id: "manga", icon: BookImage, enabled: false },
];

interface AddScreenProps {
  onSaved: (record: MediaRecord) => void;
  onCancel: () => void;
}

/** Add flow: choose a type, then fill the record in manual mode. */
export function AddScreen({ onSaved, onCancel }: AddScreenProps) {
  const { t } = useTranslation();
  // null while choosing the type; the chosen template id afterwards.
  const [templateId, setTemplateId] = useState<string | null>(null);

  if (templateId) {
    return (
      <section className="screen">
        <h1>{t("add.newRecord", { type: t(`types.${templateId}`) })}</h1>
        <RecordForm templateId={templateId} onSaved={onSaved} onCancel={onCancel} />
      </section>
    );
  }

  return (
    <section className="screen">
      <h1>{t("add.title")}</h1>
      <p className="screen-placeholder">{t("add.chooseType")}</p>
      <div className="type-grid">
        {TYPES.map((type) => (
          <TypeCard
            key={type.id}
            label={t(`types.${type.id}`)}
            icon={type.icon}
            disabled={!type.enabled}
            onSelect={() => setTemplateId(type.id)}
          />
        ))}
        {/* Becomes active with custom templates (roadmap phase 6). */}
        <TypeCard label={t("types.custom")} icon={SquarePlus} disabled onSelect={() => {}} />
      </div>
    </section>
  );
}
