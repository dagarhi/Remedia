import { useTranslation } from "react-i18next";
import type { EffectiveField, FieldValue, Label } from "@remedia/core";

/** Built-in labels are i18n keys; user labels are shown as typed. */
export function useLabel() {
  const { t } = useTranslation();
  return (label: Label) => (label.kind === "i18n" ? t(label.key) : label.text);
}

interface FieldInputProps {
  field: EffectiveField;
  value: FieldValue | undefined;
  onChange: (value: FieldValue | undefined) => void;
  /** Error message already translated, if any. */
  error?: string;
}

/**
 * One template field in the record form. The input depends on the field type.
 * Empty values become `undefined`; core drops them before saving.
 */
export function FieldInput({ field, value, onChange, error }: FieldInputProps) {
  const { t } = useTranslation();
  const label = useLabel();
  const id = `field-${field.key}`;

  function input() {
    switch (field.type) {
      case "long_text":
        return (
          <textarea id={id} rows={4} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        );
      case "text_list":
        // One text box, values separated by commas: "Lana Wachowski, Lilly Wachowski".
        // The form keeps the text as typed and splits it when saving (see toFieldValues).
        return (
          <input
            id={id}
            value={Array.isArray(value) ? value.join(", ") : ((value as string) ?? "")}
            placeholder={t("form.listHint")}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "number":
        return (
          <span className="field-with-unit">
            <input
              id={id}
              type="number"
              value={typeof value === "number" ? value : ""}
              onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
            />
            {field.unit && <span className="field-unit">{field.unit}</span>}
          </span>
        );
      case "date":
        // Partial dates are allowed, so a text box rather than a calendar: "2016", "2016-11" or "2016-11-11".
        return (
          <input
            id={id}
            value={(value as string) ?? ""}
            placeholder={t("form.dateHint")}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "select":
        return (
          <select id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
            <option value="">—</option>
            {field.options?.map((o) => (
              <option key={o.key} value={o.key}>
                {label(o.label)}
              </option>
            ))}
          </select>
        );
      case "boolean":
        return <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />;
      case "url":
        return <input id={id} type="url" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
      default:
        return <input id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
  }

  return (
    <div className={field.type === "boolean" ? "form-field form-field--inline" : "form-field"}>
      <label htmlFor={id} className="label">
        {label(field.label)}
        {field.required && " *"}
      </label>
      {input()}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
