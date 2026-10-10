import { useEffect, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import {
  countTags,
  normalizeTagName,
  suggestTags,
  type TagSuggestion,
} from "@remedia/core";
import { data } from "../db/database";
import "./TagInput.css";

/** Example tags are shown until the user has this many tags of their own. */
const SHOW_EXAMPLES_BELOW = 5;

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
  const [tagCount, setTagCount] = useState<number | null>(null);

  useEffect(() => {
    countTags(data).then(setTagCount);
  }, []);

  // Ask core for suggestions whenever the typed text or the chosen tags change.
  useEffect(() => {
    let cancelled = false;
    suggestTags(data, {
      template: templateId,
      query: draft,
      exclude: value,
      limit: 6,
    }).then((s) => {
      if (!cancelled) setSuggestions(s);
    });
    return () => {
      cancelled = true;
    };
  }, [templateId, draft, value]);

  // Examples are interface text (translated), not data: they only become tags when picked.
  const taken = new Set(
    [...value, ...suggestions.map((s) => s.tag.name)].map(normalizeTagName),
  );
  const examples =
    tagCount !== null && tagCount < SHOW_EXAMPLES_BELOW && draft === ""
      ? (t("tags.examples", { returnObjects: true }) as string[]).filter(
          (e) => !taken.has(normalizeTagName(e)),
        )
      : [];
  const realSuggestions = focused ? suggestions : [];

  function add(name: string) {
    const clean = name.trim();
    const key = normalizeTagName(clean);
    if (key !== "" && !value.some((v) => normalizeTagName(v) === key))
      onChange([...value, clean]);
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
    } else if (event.key === "Escape") {
      setDraft("");
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

      {(realSuggestions.length > 0 || examples.length > 0) && (
        <div className="tag-suggestions">
          {realSuggestions.map((s) => (
            <button
              key={s.tag.id}
              type="button"
              className="tag tag--suggestion"
              onClick={() => add(s.tag.name)}
            >
              {s.tag.name}
            </button>
          ))}
          {examples.map((name) => (
            <button
              key={name}
              type="button"
              className="tag tag--suggestion"
              onClick={() => add(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
