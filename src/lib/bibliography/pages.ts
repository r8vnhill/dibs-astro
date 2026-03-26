/**
 * Structured page reference used by bibliography helpers and reference components.
 *
 * `end` is optional so callers can represent a single-page citation without inventing a synthetic
 * range. When `end` is present and equal to `start`, normalization preserves that explicit shape
 * while formatting still renders it as a single page.
 */
export type PageReference = {
    start: number;
    end?: number;
};

/**
 * Returns whether a number is a valid page number for bibliography purposes.
 *
 * Only positive integers are accepted. Zero, negative numbers, fractional values, infinities, and
 * `NaN` are all rejected.
 */
export const isValidPageNumber = (value: number): boolean => Number.isInteger(value) && value > 0;

/**
 * Builds a `PageReference` from loose `pageStart` / `pageEnd` bounds.
 *
 * This constructor models absence with `undefined`: if there is no `start`, no reference is built.
 * An end-only input is therefore treated as missing rather than invalid. Validation is left to
 * `normalizePageReference`, which returns `null` when a constructed reference is not valid.
 */
export const pageReferenceFromBounds = (
    start?: number,
    end?: number,
): PageReference | undefined => {
    if (start === undefined) return undefined;

    return {
        start,
        ...(end !== undefined ? { end } : {}),
    };
};

/**
 * Returns a normalized page reference or `null` when the input is invalid.
 *
 * Behavior:
 * - `undefined` or structurally invalid input yields `null`
 * - a missing `end` remains a single-page reference
 * - reversed bounds are reordered
 * - equal bounds remain explicit as `{ start, end }`
 */
export const normalizePageReference = (
    pages?: PageReference,
): PageReference | null => {
    if (!pages || !isValidPageNumber(pages.start)) return null;
    if (pages.end === undefined) return { start: pages.start };
    if (!isValidPageNumber(pages.end)) return null;

    return pages.start <= pages.end
        ? { start: pages.start, end: pages.end }
        : { start: pages.end, end: pages.start };
};

/**
 * Formats a page reference for inline bibliography display.
 *
 * Invalid references return `null`. Equal bounds format as a single page (`p. n`) even though
 * normalization preserves the explicit `{ start, end }` structure.
 */
export const formatPageReference = (pages?: PageReference): string | null => {
    const normalized = normalizePageReference(pages);
    if (!normalized) return null;

    return normalized.end === undefined || normalized.start === normalized.end
        ? `p. ${normalized.start}`
        : `pp. ${normalized.start}-${normalized.end}`;
};
