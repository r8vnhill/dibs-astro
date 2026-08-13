import { load } from "cheerio";

export const DEFAULT_WORDS_PER_MINUTE = 250;
export const DEFAULT_TIME_MULTIPLIER = 1.5;
export const READING_TIME_EXCLUDE_SELECTOR = ".exclude-from-reading-time";

export type ReadingTimeOptions = Readonly<{
    wordsPerMinute?: number;
    timeMultiplier?: number;
}>;

export type ReadingTimeEstimate = Readonly<{
    words: number;
    minutes: number;
}>;

/** Convert rendered lesson HTML into text visible in the initial reading state. */
export function extractReadableText(html: string): string {
    const $ = load(html);

    $(READING_TIME_EXCLUDE_SELECTOR).remove();
    $("script, style").remove();
    $("details:not([open])").each((_, element) => {
        const summary = $(element).children("summary").first();
        $(element).replaceWith(summary.length ? summary.clone() : "");
    });

    $("br").replaceWith(" ");
    $("p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, summary, section, article, div").each((_, element) => {
        $(element).prepend(" ").append(" ");
    });

    return $.root().text().replace(/\s+/g, " ").trim();
}

/** Estimate minutes using the site's existing word-count and rounding model. */
export function estimateReadingTime(
    text: string,
    { wordsPerMinute = DEFAULT_WORDS_PER_MINUTE, timeMultiplier = 1 }: ReadingTimeOptions = {},
): ReadingTimeEstimate {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const rawMinutes = Math.max(1, Math.ceil(words / wordsPerMinute));
    return {
        words,
        minutes: Math.ceil(rawMinutes * timeMultiplier),
    };
}
