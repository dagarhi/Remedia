import { useTranslation } from "react-i18next";
import type { ProgressInfo } from "../progress";
import "./ProgressBar.css";

/** A thin bar plus a short label; without a total, only the label (UI Design, Library view). */
export function ProgressBar({ progress }: { progress: ProgressInfo }) {
  const { t } = useTranslation();
  return (
    <span className="progress">
      {progress.percent !== null && (
        <span className="progress-track" aria-hidden>
          <span className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </span>
      )}
      <span className="progress-label">
        {progress.label}
        {progress.percent !== null && ` · ${t("progress.percent", { percent: progress.percent })}`}
      </span>
    </span>
  );
}
