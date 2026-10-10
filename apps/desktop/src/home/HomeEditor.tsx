import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp } from "lucide-react";
import { HOME_BLOCKS, type HomeBlock } from "@remedia/core";
import { LIBRARY_ORDER } from "../recordTypes";
import { useSettings } from "../settings/SettingsContext";

/** "Edit home": turn blocks on and off, reorder them, and choose the libraries shown. */
export function HomeEditor() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const active = settings["home.blocks"];
  const libraries = settings["home.libraries"];

  // Active blocks first, in their order; then the inactive ones.
  const rows: HomeBlock[] = [...active, ...HOME_BLOCKS.filter((b) => !active.includes(b))];

  function toggle(block: HomeBlock) {
    update("home.blocks", active.includes(block) ? active.filter((b) => b !== block) : [...active, block]);
  }

  function move(block: HomeBlock, offset: -1 | 1) {
    const from = active.indexOf(block);
    const to = from + offset;
    if (to < 0 || to >= active.length) return;
    const next = [...active];
    [next[from], next[to]] = [next[to], next[from]];
    update("home.blocks", next);
  }

  return (
    <div className="home-editor">
      <ul className="home-editor-list">
        {rows.map((block) => {
          const on = active.includes(block);
          const index = active.indexOf(block);
          return (
            <li key={block} className="home-editor-row">
              <label>
                <input type="checkbox" checked={on} onChange={() => toggle(block)} />
                {t(`home.blocks.${block}`)}
              </label>
              {on && (
                <span className="home-editor-move">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t("home.moveUp")}
                    disabled={index === 0}
                    onClick={() => move(block, -1)}
                  >
                    <ArrowUp size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t("home.moveDown")}
                    disabled={index === active.length - 1}
                    onClick={() => move(block, 1)}
                  >
                    <ArrowDown size={14} aria-hidden />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {active.includes("libraries") && (
        <fieldset className="home-editor-libraries">
          <legend className="label">{t("home.librariesShown")}</legend>
          {LIBRARY_ORDER.map((status) => (
            <label key={status}>
              <input
                type="checkbox"
                checked={libraries.includes(status)}
                onChange={() =>
                  update(
                    "home.libraries",
                    // Keep the lifecycle order whatever the click order.
                    LIBRARY_ORDER.filter((s) => (s === status ? !libraries.includes(s) : libraries.includes(s))),
                  )
                }
              />
              {t(`libraries.${status}`)}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
