import { useEffect, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { normalizeTagName, suggestTags, type TagSuggestion } from "@remedia/core";
import { data } from "../db/database";
import "./TagInput.css";

interface TagInputProps {
  /** Template of the record, so tags used on the same type are suggested first. */
  templateId: string;
  value: string[];
  onChange: (tags: string[]) => void;
}

/**
 * Tags as removable pills plus a text box. Enter or comma adds the typed tag;
 * Backspace on an empty box removes the last one; suggestions come from usage.
 */
export function TagInput({ templateId, value, onChange }: TagInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [focused, setFocused] = useState(false);

  // Ask core for suggestions whenever the typed text or the chosen tags change.
  useEffect(() => {
    let cancelled = false;
    suggestTags(data, { template: templateId, query: draft, exclude: value, limit: 6 }).then((s) => {
      if (!cancelled) setSuggestions(s);
    });
    return () => {
      cancelled = true;
    };
  }, [templateId, draft, value]);

  function add(name: string) {
    const clean = name.trim();
    const key = normalizeTagName(clean);
    if (key !== "" && !value.some((v) => normalizeTagName(v) === key)) onChange([...value, clean]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault(); // Enter would submit the form; the comma would be typed
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className="tag-input">
      <div className="tag-input-box">
        {value.map((name) => (
          <span key={name} className="tag">
            {name}
            <button
              type="button"
              className="tag-remove"
              aria-label={t("tags.remove", { name })}
              onClick={() => remove(name)}
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        <input
          id="tags"
          value={draft}
          placeholder={value.length === 0 ? t("tags.placeholder") : ""}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          // Delay so a click on a suggestion lands before the list disappears.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </div>

      {focused && suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.map((s) => (
            <button key={s.tag.id} type="button" className="tag tag--suggestion" onClick={() => add(s.tag.name)}>
              {s.tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
