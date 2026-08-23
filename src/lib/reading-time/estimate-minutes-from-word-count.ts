/** Default reading speed used across the site wherever a word count needs to become a minute estimate. */
export const DEFAULT_WORDS_PER_MINUTE = 250;

/**
 * Pure word-count → reading-minutes primitive shared by the page reading-time estimator
 * ({@link ../../components/reading-time/reading-time#estimateReadingTime}) and the lesson-reading effort resolver
 * ({@link ../readings/reading-effort#resolveReadingEffort}). Living under `src/lib` (rather than inside
 * `src/components/reading-time`) keeps the lesson-reading domain code from depending on a UI-layer module.
 *
 * Callers that need a "never zero" floor (e.g. displaying "1 min" for any page with content) apply that on top
 * of this raw estimate — this function intentionally returns 0 for 0 words.
 */
export function estimateMinutesFromWordCount(
    wordCount: number,
    wordsPerMinute: number = DEFAULT_WORDS_PER_MINUTE,
): number {
    return Math.ceil(wordCount / wordsPerMinute);
}
