/**
 * Aggregation of Hume prosody scores.
 *
 * These arrive on nearly every utterance, so readings are kept in a bounded
 * ring buffer rather than an ever-growing array. Prosody is treated as a signal
 * for adapting tone and for the trigger timeline only. It never gates crisis
 * escalation, which stays on a hardcoded, always-available path.
 */

export type EmotionScores = Record<string, number>;

export type Emotion = { name: string; score: number };

export type EmotionReading = {
  at: number;
  top: Emotion[];
  distress: number;
};

/** Maximum readings retained for the session timeline. */
export const READING_CAP = 60;

/**
 * Emotions treated as distress for the purpose of softening EVI's pacing.
 * Deliberately broad, because the response to a false positive (slowing down
 * and grounding) is harmless.
 */
export const DISTRESS_EMOTIONS = [
  "Distress",
  "Anxiety",
  "Fear",
  "Sadness",
  "Pain",
  "Shame",
  "Guilt",
  "Craving",
] as const;

/** Returns the n highest-scoring emotions, sorted descending. */
export function topEmotions(scores: EmotionScores | undefined, n = 3): Emotion[] {
  if (!scores) return [];
  return Object.entries(scores)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, n));
}

/** Peak score across the distress emotions, in the range 0 to 1. */
export function distressLevel(scores: EmotionScores | undefined): number {
  if (!scores) return 0;
  return DISTRESS_EMOTIONS.reduce(
    (peak, name) => Math.max(peak, scores[name] ?? 0),
    0,
  );
}

/** Appends a reading, dropping the oldest once the cap is reached. */
export function appendReading(
  buffer: readonly EmotionReading[],
  reading: EmotionReading,
  cap = READING_CAP,
): EmotionReading[] {
  const next = [...buffer, reading];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/** Builds a reading from raw scores at a point in time. */
export function readingFrom(scores: EmotionScores | undefined, at: number): EmotionReading {
  return { at, top: topEmotions(scores), distress: distressLevel(scores) };
}
