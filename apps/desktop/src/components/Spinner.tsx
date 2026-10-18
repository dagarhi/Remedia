import "./Spinner.css";

interface SpinnerProps {
  /** Diameter in px. */
  size?: number;
}

/** A small spinning circle for waits; decorative, the text next to it says what is happening. */
export function Spinner({ size = 16 }: SpinnerProps) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      aria-hidden
    >
    </span>
  );
}
