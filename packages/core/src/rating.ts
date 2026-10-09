/** Ratings are stored on a fixed 1-100 scale; null means not rated (never 0). */
export const RATING_MIN = 1;
export const RATING_MAX = 100;

export const RATING_SCALES = ["stars_5", "stars_5_half", "out_of_10", "out_of_100"] as const;

export type RatingScale = (typeof RATING_SCALES)[number];

interface ScaleSpec {
  /** Highest display value. */
  max: number;
  /** Smallest display increment. */
  step: number;
}

const SCALES: Record<RatingScale, ScaleSpec> = {
  stars_5: { max: 5, step: 1 },
  stars_5_half: { max: 5, step: 0.5 },
  out_of_10: { max: 10, step: 1 },
  out_of_100: { max: 100, step: 1 },
};

export function ratingScaleSpec(scale: RatingScale): Readonly<ScaleSpec> {
  return SCALES[scale];
}

export function isValidStoredRating(value: number): boolean {
  return Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX;
}

/**
 * Stored value -> value shown on a display scale, rounded to the scale's step.
 * A rated record never shows as 0: the lowest display value is one step.
 */
export function toDisplayRating(stored: number, scale: RatingScale): number {
  const { max, step } = SCALES[scale];
  const steps = Math.round(((stored / RATING_MAX) * max) / step);
  return Math.max(1, steps) * step;
}

/**
 * Value entered on a display scale -> stored value. Only edits call this, so a stored
 * value is never changed just by showing it on a coarser scale.
 */
export function fromDisplayRating(display: number, scale: RatingScale): number {
  const { max, step } = SCALES[scale];
  if (display < step || display > max || !Number.isInteger(display / step)) {
    throw new RangeError(`Invalid rating ${display} for scale ${scale}`);
  }
  return Math.round((display / max) * RATING_MAX);
}
