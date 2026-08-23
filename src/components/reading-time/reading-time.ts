import { load } from "cheerio";
import {
    DEFAULT_WORDS_PER_MINUTE,
    estimateMinutesFromWordCount,
} from "~/lib/reading-time/estimate-minutes-from-word-count";

/**
 * Re-exported so existing imports of `DEFAULT_WORDS_PER_MINUTE` from this module keep working. The value itself
 * lives in `~/lib/reading-time`, shared with the lesson-reading effort resolver (`~/lib/readings/reading-effort`).
 */
export { DEFAULT_WORDS_PER_MINUTE };
export const DEFAULT_TIME_MULTIPLIER = 1.5;
export const READING_TIME_EXCLUDE_SELECTOR = ".exclude-from-reading-time";

/**
 * HTML elements that carry separate readable units in lesson content.
 *
 * This is semantic rather than visual: extraction must not depend on CSS layout. Text within
 * these elements gets a lexical separator before and after traversal so adjacent units cannot
 * merge words when their tags disappear.
 */
export const READABLE_BOUNDARY_ELEMENTS = new Set([
    "article",
    "aside",
    "blockquote",
    "br",
    "caption",
    "code",
    "dd",
    "details",
    "div",
    "dt",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "main",
    "p",
    "pre",
    "section",
    "summary",
    "td",
    "th",
]);

type ReadableHtmlNode = Readonly<{
    type: string;
    data?: string;
    name?: string;
    attribs?: Readonly<Record<string, string>>;
    children?: readonly ReadableHtmlNode[];
}>;

export type ReadingTimeOptions = Readonly<{
    wordsPerMinute?: number;
    timeMultiplier?: number;
}>;

export type ReadingTimeEstimate = Readonly<{
    words: number;
    minutes: number;
}>;

const hasExcludedClass = (node: ReadableHtmlNode): boolean =>
    node.attribs?.class
        ?.split(/\s+/)
        .includes(READING_TIME_EXCLUDE_SELECTOR.slice(1)) ?? false;

const isOpenDetails = (node: ReadableHtmlNode): boolean => Object.hasOwn(node.attribs ?? {}, "open");

const isElement = (node: ReadableHtmlNode, name: string): boolean => node.name?.toLowerCase() === name;

/** Convert rendered lesson HTML into text visible in the initial reading state. */
export function extractReadableText(html: string): string {
    const $ = load(html);
    const fragments: string[] = [];
    const appendBoundary = () => fragments.push(" ");
    const visit = (node: ReadableHtmlNode): void => {
        if (node.type === "text") {
            fragments.push(node.data ?? "");
            return;
        }

        const name = node.name?.toLowerCase();
        if (name === "script" || name === "style" || hasExcludedClass(node)) return;
        if (name === "br") {
            appendBoundary();
            return;
        }

        if (isElement(node, "details") && !isOpenDetails(node)) {
            node.children?.filter((child) => isElement(child, "summary")).forEach(visit);
            return;
        }

        const createsBoundary = name !== undefined && READABLE_BOUNDARY_ELEMENTS.has(name);
        if (createsBoundary) appendBoundary();
        node.children?.forEach(visit);
        if (createsBoundary) appendBoundary();
    };

    $.root().contents().toArray().forEach((node) => visit(node as ReadableHtmlNode));
    return fragments.join("").replace(/\s+/g, " ").trim();
}

/**
 * Estimate minutes using the site's existing word-count and rounding model. Delegates the raw words → minutes
 * conversion to {@link estimateMinutesFromWordCount}, then applies a 1-minute floor and the optional multiplier
 * on top — page reading time should never display "0 min" for a page that has any content.
 */
export function estimateReadingTime(
    text: string,
    { wordsPerMinute = DEFAULT_WORDS_PER_MINUTE, timeMultiplier = 1 }: ReadingTimeOptions = {},
): ReadingTimeEstimate {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const rawMinutes = Math.max(1, estimateMinutesFromWordCount(words, wordsPerMinute));
    return {
        words,
        minutes: Math.ceil(rawMinutes * timeMultiplier),
    };
}
