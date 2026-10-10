import { useTranslation } from "react-i18next";
import { RECORD_STATUSES, type RecordStatus } from "@remedia/core";
import { Select } from "./Select";

/** Status label for a record type ("Watching" for movies), falling back to the generic one. */
export function useStatusLabel() {
  const { t } = useTranslation();
  return (templateId: string, status: RecordStatus) => t([`status.${templateId}.${status}`, `status.default.${status}`]);
}

interface StatusSelectProps {
  id?: string;
  templateId: string;
  value: RecordStatus;
  onChange: (status: RecordStatus) => void;
}

export function StatusSelect({ id, templateId, value, onChange }: StatusSelectProps) {
  const statusLabel = useStatusLabel();
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value as RecordStatus)}>
      {RECORD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {statusLabel(templateId, s)}
        </option>
      ))}
    </Select>
  );
}
