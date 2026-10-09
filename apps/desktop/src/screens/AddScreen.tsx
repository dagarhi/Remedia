import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SquarePlus } from "lucide-react";
import type { MediaRecord } from "@remedia/core";
import { RecordForm } from "../components/RecordForm";
import { TypeCard } from "../components/TypeCard";
import { RECORD_TYPES } from "../recordTypes";
import "./AddScreen.css";

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
        {RECORD_TYPES.map((type) => (
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
