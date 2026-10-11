import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PenLine, Search } from "lucide-react";
import type { AddMode } from "@remedia/core";
import "../components/ConfirmDialog.css";

interface ModeDialogProps {
  templateId: string;
  /** `remember` = save the choice for this type (changeable in Settings). */
  onChoose: (mode: Exclude<AddMode, "ask">, remember: boolean) => void;
  onCancel: () => void;
}

/** The only dialog in the add flow (UI Design): automatic or manual, shown while the type is set to "ask". */
export function ModeDialog({ templateId, onChoose, onCancel }: ModeDialogProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const [remember, setRemember] = useState(false);
  const type = t(`types.${templateId}`);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className="confirm-dialog mode-dialog" onCancel={onCancel}>
      <h2>{t("add.modeTitle", { type })}</h2>
      <div className="mode-options">
        <button type="button" className="mode-option" onClick={() => onChoose("automatic", remember)}>
          <Search size={20} aria-hidden />
          <span className="mode-option-name">{t("add.automatic")}</span>
          <span className="mode-option-hint">{t("add.automaticHint")}</span>
        </button>
        <button type="button" className="mode-option" onClick={() => onChoose("manual", remember)}>
          <PenLine size={20} aria-hidden />
          <span className="mode-option-name">{t("add.manual")}</span>
          <span className="mode-option-hint">{t("add.manualHint")}</span>
        </button>
      </div>
      <label className="mode-remember">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        {t("add.remember", { type })}
      </label>
    </dialog>
  );
}
