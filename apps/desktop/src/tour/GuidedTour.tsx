import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import "./GuidedTour.css";

/*
 * Guided tour over the real interface (UI Design, first run): each step highlights one
 * element marked with `data-tour="<target>"` and explains it, with Back / Next / Skip.
 */

export interface TourStep {
  /** i18n key under `tour.steps`. */
  id: string;
  /** Value of the `data-tour` attribute to highlight; none = a centred card. */
  target?: string;
}

/** The steps approved for the first release, in order. */
export const TOUR_STEPS: TourStep[] = [
  { id: "intro" },
  { id: "add", target: "add" },
  { id: "home", target: "home" },
  { id: "libraries", target: "libraries" },
  { id: "settings", target: "profile" },
  { id: "done", target: "add" },
];

/** Space between the highlight and the element, and between the highlight and the card. */
const PADDING = 6;
const GAP = 16;

/** The highlighted element's box, kept up to date when the window changes size. */
function useTargetRect(target: string | undefined): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const element = document.querySelector(`[data-tour="${target}"]`);
      setRect(element ? element.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [target]);

  return rect;
}

export function GuidedTour({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];
  const rect = useTargetRect(step.target);
  const isLast = index === TOUR_STEPS.length - 1;

  const next = () => (isLast ? onClose() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Keyboard: arrows move between steps, Esc skips the tour.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The card sits to the right of the highlighted element (all targets are in the sidebar),
  // kept inside the window; without a target it is centred.
  const cardStyle = rect
    ? { left: rect.right + PADDING + GAP, top: Math.max(GAP, Math.min(rect.top - PADDING, window.innerHeight - 240)) }
    : undefined;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        // A transparent box over the element; its huge shadow darkens everything else.
        <div
          className="tour-spotlight"
          style={{
            left: rect.left - PADDING,
            top: rect.top - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
        />
      ) : (
        <div className="tour-veil" />
      )}

      <div className={rect ? "tour-card" : "tour-card tour-card--centred"} style={cardStyle}>
        <button type="button" className="icon-button tour-close" aria-label={t("tour.skip")} onClick={onClose}>
          <X size={16} aria-hidden />
        </button>
        <span className="label">{t("tour.progress", { current: index + 1, total: TOUR_STEPS.length })}</span>
        <h2 id="tour-title">{t(`tour.steps.${step.id}.title`)}</h2>
        <p>{t(`tour.steps.${step.id}.text`)}</p>
        <div className="tour-actions">
          <button type="button" className="link-button" onClick={onClose}>
            {t("tour.skip")}
          </button>
          <span className="tour-nav">
            {index > 0 && (
              <button type="button" className="button" onClick={back}>
                {t("tour.back")}
              </button>
            )}
            <button type="button" className="button button--primary" autoFocus onClick={next}>
              {t(isLast ? "tour.finish" : "tour.next")}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
