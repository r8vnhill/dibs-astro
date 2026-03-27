/**
 * Loose page-reference shape accepted from bibliography parsers, catalog loaders, and other
 * external inputs.
 *
 * This type models the untrusted edge of the page-reference subsystem. Callers may provide:
 *
 * - missing bounds;
 * - invalid numeric values; or
 * - reversed ranges.
 *
 * Those cases are intentionally permitted here so parsing functions can act as the normalization
 * boundary between external data and the trusted internal domain model represented by
 * {@link PageReference}.
 *
 * Both properties are optional because upstream loaders may encounter partial metadata and still
 * need to preserve that intermediate shape until validation occurs.
 */
export type UnsafePageReference = Readonly<{
    start?: number;
    end?: number;
}>;

/**
 * Validated page reference used by bibliography helpers and reference components.
 *
 * A {@link PageReference} is trusted application data:
 *
 * - `start` is always a positive integer;
 * - `end`, when present, is also a positive integer; and
 * - parsing guarantees that `start <= end`.
 *
 * The `end` property remains optional so single-page citations do not need an artificial range.
 * When `end` is present and equal to `start`, that explicit shape is preserved by parsing even
 * though formatting still renders it as a single page.
 */
export type PageReference = Readonly<{
    start: number;
    end?: number;
}>;

/**
 * Formatting policy for inline page labels.
 *
 * These options control only presentation, not validation or normalization. They let callers reuse
 * the same {@link PageReference} with different bibliography or UI conventions by overriding:
 *
 * - the label for a single page;
 * - the label for a page range; and
 * - the separator used between range bounds.
 *
 * The defaults match the current site convention: `p.` / `pp.` with a hyphen.
 */
export type PageFormatOptions = Readonly<{
    singleLabel: string;
    rangeLabel: string;
    separator: string;
}>;

/**
 * Default inline formatting policy for page references.
 *
 * This constant is intentionally internal to the module. Callers that need a different style can
 * pass their own {@link PageFormatOptions} to {@link formatPageReference}.
 */
const DEFAULT_PAGE_FORMAT: PageFormatOptions = {
    singleLabel: "p.",
    rangeLabel: "pp.",
    separator: "-",
};

/**
 * Returns whether a number is a valid bibliography page number.
 *
 * A valid page number must be a positive integer. The function rejects:
 *
 * - `0`;
 * - negative numbers;
 * - fractional numbers;
 * - `NaN`; and
 * - infinities.
 *
 * @param value
 *   Number to validate.
 * @returns
 *   `true` when `value` is a positive integer page number.
 */
export const isValidPageNumber = (value: number): boolean => Number.isInteger(value) && value > 0;

/**
 * Converts a raw numeric value into a valid page number or `undefined`.
 *
 * This helper is intentionally internal. It centralizes the rule that invalid or absent values do
 * not throw and instead collapse to `undefined`, which keeps the public parsers small and
 * consistent.
 *
 * @param value
 *   Raw numeric value to validate.
 * @returns
 *   The original value when it is a valid page number; otherwise `undefined`.
 */
const toPageNumber = (value?: number): number | undefined =>
    value !== undefined && isValidPageNumber(value) ? value : undefined;

/**
 * Parses raw page bounds into a validated, normalized {@link PageReference}.
 *
 * This function is the main constructor for trusted page-reference values built from loose numeric
 * bounds.
 *
 * ## Normalization rules:
 *
 * - missing `start` returns `undefined`;
 * - invalid numeric bounds return `undefined`;
 * - a missing `end` produces a single-page reference;
 * - reversed bounds are reordered; and
 * - equal bounds remain explicit as `{ start, end }`.
 *
 * This parser does not throw. Invalid or incomplete input is represented as `undefined` so callers
 * can naturally compose it with optional metadata flows.
 *
 * @param start First page of the reference.
 * @param end Optional last page of the reference.
 * @returns A validated, normalized {@link PageReference}, or `undefined` when
 * the input does not describe a valid reference.
 */
export function parsePageReference(
    start?: number,
    end?: number,
): PageReference | undefined {
    const pageStart = toPageNumber(start);
    if (pageStart === undefined) return undefined;

    if (end === undefined) return { start: pageStart };

    const pageEnd = toPageNumber(end);
    if (pageEnd === undefined) return undefined;

    return pageStart <= pageEnd
        ? { start: pageStart, end: pageEnd }
        : { start: pageEnd, end: pageStart };
}

/**
 * Parses a loose {@link UnsafePageReference} into a validated, normalized {@link PageReference}.
 *
 * This is the object-shaped counterpart to {@link parsePageReference}. It is useful when page data
 * comes from loaders, parsers, frontmatter, or catalog records that already package bounds into a
 * single object.
 *
 * The function delegates all validation and normalization to {@link parsePageReference}, so both
 * entry points always share the same semantics.
 *
 * @param input
 *   Loose page-reference object to parse.
 * @returns
 *   A validated, normalized {@link PageReference}, or `undefined` when the input is missing or
 *   invalid.
 */
export const parsePageReferenceInput = (
    input?: UnsafePageReference,
): PageReference | undefined => parsePageReference(input?.start, input?.end);

/**
 * Compatibility wrapper around the parser-first API.
 *
 * New code should prefer {@link parsePageReference} when working with raw numeric bounds or
 * {@link parsePageReferenceInput} when working with object-shaped input.
 *
 * This wrapper exists to keep older callers on the same normalization semantics while the
 * subsystem gradually converges on parser-oriented naming. It does not add extra behavior beyond
 * delegating to {@link parsePageReferenceInput}.
 *
 * @param pages
 *   Loose page-reference object to normalize.
 * @returns
 *   A validated, normalized {@link PageReference}, or `undefined` when the input is missing or
 *   invalid.
 */
export const normalizePageReference = (
    pages?: UnsafePageReference,
): PageReference | undefined => parsePageReferenceInput(pages);

/**
 * Formats a validated {@link PageReference} for inline bibliography display.
 *
 * This function assumes the input is already trusted. It does not perform validation or
 * reordering; those responsibilities belong to the parsing functions.
 *
 * ## Formatting rules:
 *
 * - missing references return `undefined`;
 * - single pages render as `<singleLabel> n`; and
 * - ranges render as `<rangeLabel> start<separator>end`.
 *
 * When a parsed reference preserves an explicit `{ start, end }` with equal bounds, formatting
 * still renders it as a single page.
 *
 * @param pages
 *   Validated page reference to format.
 * @param options
 *   Optional formatting policy. Defaults to the module's inline bibliography convention.
 * @returns
 *   A formatted page label, or `undefined` when `pages` is missing.
 */
export const formatPageReference = (
    pages?: PageReference,
    options: PageFormatOptions = DEFAULT_PAGE_FORMAT,
): string | undefined =>
    !pages
        ? undefined
        : (pages.end === undefined || pages.start === pages.end
            ? `${options.singleLabel} ${pages.start}`
            : `${options.rangeLabel} ${pages.start}${options.separator}${pages.end}`);
