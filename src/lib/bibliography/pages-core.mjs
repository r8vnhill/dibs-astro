/**
 * @file Core runtime implementation for numeric page references.
 *
 * This module provides the dependency-light JavaScript implementation shared by bibliography catalog loading, JSON-LD 
 * normalization, and the typed TypeScript facade in `pages.ts`.
 *
 * A valid page number is a positive safe integer. A valid page reference is either:
 *
 * - a single page: `{ start: 5 }`;
 * - a normalized range: `{ start: 5, end: 10 }`.
 *
 * The parser accepts untrusted boundary values and returns `undefined` when a valid reference cannot be produced. The 
 * guard validates already-normalized values and rejects reversed ranges.
 *
 * Important semantic distinction:
 *
 * - `parsePageReference(10, 5)` normalizes the input to `{ start: 5, end: 10 }`;
 * - `isPageReference({ start: 10, end: 5 })` returns `false`.
 *
 * Single-page references may omit `end`, but equal-bound ranges are preserved by the parser when both bounds are 
 * provided. For example, `parsePageReference(5)` returns `{ start: 5 }`, while `parsePageReference(5, 5)` returns 
 * `{ start: 5, end: 5 }`.
 *
 * `formatPageReference` assumes a trusted page reference. It does not validate, reorder, or repair arbitrary objects. 
 * Use `parsePageReference`, `parsePageReferenceInput`, or `isPageReference` at untrusted boundaries before formatting.
 */

/**
 * Default presentation options for numeric page references.
 *
 * The defaults follow the common citation convention where single pages use `"p."`, page ranges use `"pp."`, and 
 * ranges are separated by an en dash.
 *
 * @type {Readonly<{
 *   singleLabel: string,
 *   rangeLabel: string,
 *   separator: string,
 * }>}
 */
export const DEFAULT_PAGE_FORMAT = Object.freeze({
    singleLabel: "p.",
    rangeLabel: "pp.",
    separator: "–",
});

/**
 * Checks whether a value is a plain inspectable object for boundary parsing.
 *
 * Arrays are rejected because page-reference inputs are object-shaped records with named `start` and `end` fields.
 *
 * @param {unknown} value Value to inspect.
 * @returns {value is Record<PropertyKey, unknown>} `true` when `value` is a non-null, non-array object.
 */
export const isRecord = (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Checks whether a value is a valid numeric page number.
 *
 * Valid page numbers are positive safe integers. This rejects zero, negative numbers, floats, `NaN`, infinities, 
 * non-numeric values, and integers outside JavaScript's safe integer range.
 *
 * @param {unknown} value Value to validate.
 * @returns {value is number} `true` when `value` is a valid page number.
 */
export const isValidPageNumber = (value) =>
    typeof value === "number" && Number.isSafeInteger(value) && value > 0;

/**
 * Parses a value as a numeric page number.
 *
 * @param {unknown} value Value to parse.
 * @returns {number | undefined} The validated page number, or `undefined` when invalid.
 */
export const parsePageNumber = (value) =>
    isValidPageNumber(value) ? value : undefined;

/**
 * Creates a page-reference object from validated bounds.
 *
 * This helper assumes its inputs have already been validated. It preserves `end` whenever it is provided, including 
 * equal-bound ranges such as `{ start: 5, end: 5 }`.
 *
 * @param {number} start Valid start page.
 * @param {number | undefined} end Optional valid end page.
 * @returns {{ start: number, end?: number }} A page reference.
 */
const toPageReference = (start, end) => ({
    start,
    ...(end !== undefined ? { end } : {}),
});

/**
 * Creates a normalized page range from two validated page numbers.
 *
 * The returned reference always satisfies `start <= end`. If the values are reversed, they are swapped.
 *
 * @param {number} first First valid page number.
 * @param {number} second Second valid page number.
 * @returns {{ start: number, end: number }} A normalized page range.
 */
export const createOrderedPageReference = (first, second) =>
    first <= second
        ? toPageReference(first, second)
        : toPageReference(second, first);

/**
 * Resolves page-format options by merging partial overrides with defaults.
 *
 * Non-object options are ignored at runtime so callers at untrusted boundaries fall back to the default format instead 
 * of producing incomplete labels.
 *
 * @param {unknown} [options={}] Partial format options.
 * @returns {{
 *   singleLabel: string,
 *   rangeLabel: string,
 *   separator: string,
 * }} Complete page-format options.
 */
export const resolvePageFormat = (options = {}) => ({
    ...DEFAULT_PAGE_FORMAT,
    ...(isRecord(options) ? options : {}),
});

/**
 * Validates whether an unknown value is an already-normalized page reference.
 *
 * Unlike `parsePageReference`, this guard does not reorder values. A range with `start > end` is invalid because 
 * guards should validate trusted shape, not repair input.
 *
 * @param {unknown} value Value to validate.
 * @returns {value is { start: number, end?: number }} `true` when `value` is a valid page reference.
 */
export function isPageReference(value) {
    if (!isRecord(value)) {
        return false;
    }

    const candidate = value;

    if (!isValidPageNumber(candidate.start)) {
        return false;
    }

    if (candidate.end === undefined) {
        return true;
    }

    return isValidPageNumber(candidate.end) && candidate.start <= candidate.end;
}

/**
 * Parses numeric page bounds into a validated page reference.
 *
 * The `start` value is required. The `end` value is optional. When both values are valid, reversed bounds are 
 * normalized into ascending order.
 *
 * @param {unknown} start Candidate start page.
 * @param {unknown} [end] Candidate end page.
 * @returns {{ start: number, end?: number } | undefined} A page reference, or `undefined` when parsing fails.
 */
export function parsePageReference(start, end) {
    const pageStart = parsePageNumber(start);
    if (pageStart === undefined) return undefined;

    if (end === undefined) return toPageReference(pageStart);

    const pageEnd = parsePageNumber(end);
    if (pageEnd === undefined) return undefined;

    return createOrderedPageReference(pageStart, pageEnd);
}

/**
 * Parses an object-shaped boundary value into a validated page reference.
 *
 * This function is intended for loose data from frontmatter, JSON-LD, generated catalog input, or other untrusted 
 * sources. Non-record inputs, arrays, missing `start` values, and invalid page numbers return `undefined`.
 *
 * @param {unknown} input Candidate object containing `start` and optional `end`.
 * @returns {{ start: number, end?: number } | undefined} A page reference, or `undefined` when parsing fails.
 */
export function parsePageReferenceInput(input) {
    if (!isRecord(input)) return undefined;

    return parsePageReference(input.start, input.end);
}

/**
 * Formats a trusted page reference for presentation.
 *
 * Single pages use `singleLabel`; ranges use `rangeLabel` and `separator`. Partial format options are merged over 
 * `DEFAULT_PAGE_FORMAT`.
 *
 * This function assumes `pages` is already trusted. It intentionally does not validate, reorder, or repair malformed 
 * objects.
 *
 * @param {{ start: number, end?: number } | undefined | null} pages Trusted page reference to format.
 * @param {unknown} [options] Partial format options.
 * @returns {string | undefined} Formatted page reference, or `undefined` when `pages` is absent.
 */
export function formatPageReference(pages, options) {
    if (!pages) return undefined;

    const format = resolvePageFormat(options);
    const isSinglePage = pages.end === undefined || pages.start === pages.end;

    return isSinglePage
        ? `${format.singleLabel} ${pages.start}`
        : `${format.rangeLabel} ${pages.start}${format.separator}${pages.end}`;
}
