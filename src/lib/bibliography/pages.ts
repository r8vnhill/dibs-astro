/**
 * Loose page-reference shape accepted at module boundaries.
 *
 * Use this type for data that comes from bibliography parsers, catalog loaders, frontmatter, or
 * any other source that has not been validated yet.
 *
 * It intentionally permits incomplete or invalid values, including:
 *
 * - missing bounds;
 * - non-page numeric values; and
 * - reversed ranges.
 *
 * That makes {@link PageReferenceInput} a suitable edge type for external data, while
 * {@link PageReference} remains the trusted internal representation used by formatting helpers and
 * UI code.
 *
 * Both properties are optional because upstream loaders may need to preserve partial metadata
 * before validation occurs.
 */
export type PageReferenceInput = Readonly<{
    start?: number;
    end?: number;
}>;

/**
 * Structural shape shared by trusted page references before branding.
 *
 * Keep this alias internal so callers interact with the branded {@link PageReference} type rather
 * than its raw object shape.
 */
type PageReferenceShape = Readonly<{
    start: number;
    end?: number;
}>;

/**
 * Unique brand used to distinguish validated page references from loose objects.
 *
 * The brand prevents code outside this module from manufacturing trusted {@link PageReference}
 * values by shape alone.
 */
declare const pageReferenceBrand: unique symbol;

/**
 * Validated page reference used by bibliography helpers and reference components.
 *
 * A {@link PageReference} represents trusted application data with these guarantees:
 *
 * - `start` is always a positive integer;
 * - `end`, when present, is also a positive integer; and
 * - `start <= end` always holds.
 *
 * The `end` property stays optional so single-page references do not require an artificial range.
 * When parsing receives equal bounds, that explicit shape is preserved even though formatting
 * still renders it as a single page.
 *
 * The intended construction paths are:
 *
 * - {@link parsePageReference};
 * - {@link parsePageReferenceInput}; and
 * - {@link isPageReference} when refining `unknown` values at runtime.
 */
export type PageReference = PageReferenceShape & {
    readonly [pageReferenceBrand]: true;
};

/**
 * Formatting policy for inline page labels.
 *
 * These options affect presentation only. They do not participate in validation or normalization.
 *
 * Use them to format the same {@link PageReference} with different bibliography or UI conventions
 * by overriding:
 *
 * - the label used for a single page;
 * - the label used for a page range; and
 * - the separator placed between range bounds.
 *
 * The module defaults are `p.`, `pp.`, and `–`.
 */
export type PageFormatOptions = Readonly<{
    singleLabel: string;
    rangeLabel: string;
    separator: string;
}>;

/**
 * Default inline formatting policy for page references.
 *
 * This constant remains internal because callers can pass custom {@link PageFormatOptions}
 * directly to {@link formatPageReference} when they need a different convention.
 */
const DEFAULT_PAGE_FORMAT: PageFormatOptions = {
    singleLabel: "p.",
    rangeLabel: "pp.",
    separator: "–",
};

/**
 * Returns whether a number is a valid bibliography page number.
 *
 * A valid page number must be a positive safe integer. This excludes:
 *
 * - `0`;
 * - negative numbers;
 * - fractional numbers;
 * - `NaN`; and
 * - infinities.
 *
 * @param value Number to validate.
 * @returns `true` when `value` is a valid page number.
 */
export const isValidPageNumber = (value: number): boolean =>
    Number.isSafeInteger(value) && value > 0;

/**
 * Converts a raw numeric value into a valid page number.
 *
 * This helper centralizes the rule that invalid or absent values collapse to `undefined` instead
 * of throwing. That keeps the public parsers small, consistent, and easy to compose with optional
 * metadata flows.
 *
 * @param value Raw numeric value to validate.
 * @returns The original value when it is valid, or `undefined` otherwise.
 */
const toPageNumber = (value?: number): number | undefined =>
    value !== undefined && isValidPageNumber(value) ? value : undefined;

/**
 * Applies the trust brand to an already validated page-reference shape.
 *
 * Keep this helper local to the module so callers cannot bypass the validation boundary enforced
 * by the public parsers and runtime guard.
 *
 * @param start Valid first page.
 * @param end Optional valid last page.
 * @returns A branded {@link PageReference}.
 */
const toPageReference = (start: number, end?: number): PageReference =>
    ({ start, ...(end !== undefined ? { end } : {}) }) as PageReference;

/**
 * Returns whether an unknown value satisfies the {@link PageReference} contract.
 *
 * This guard is useful at runtime boundaries where data may already have object shape but is not
 * yet trusted statically, such as decoded JSON payloads, catalog records, or test fixtures built
 * from `unknown`.
 *
 * Unlike the parsing helpers, this function only validates. It does not reorder reversed bounds or
 * otherwise normalize the value.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` matches the runtime invariants of
 * {@link PageReference}.
 */
export function isPageReference(value: unknown): value is PageReference {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as { start?: unknown; end?: unknown };

    if (typeof candidate.start !== "number" || !isValidPageNumber(candidate.start)) {
        return false;
    }

    if (candidate.end === undefined) {
        return true;
    }

    return typeof candidate.end === "number"
        && isValidPageNumber(candidate.end)
        && candidate.start <= candidate.end;
}

/**
 * Parses raw page bounds into a validated, normalized {@link PageReference}.
 *
 * This is the main constructor for trusted page-reference values built from loose numeric bounds.
 *
 * ## Normalization rules:
 *
 * - missing `start` returns `undefined`;
 * - invalid numeric bounds return `undefined`;
 * - a missing `end` produces a single-page reference;
 * - reversed bounds are reordered; and
 * - equal bounds remain explicit as `{ start, end }`.
 *
 * The function never throws. Invalid or incomplete input is represented as `undefined`, which
 * makes it easy to compose with optional metadata flows.
 *
 * @param start
 *   First page of the reference.
 * @param end
 *   Optional last page of the reference.
 * @returns
 *   A validated, normalized {@link PageReference}, or `undefined` when the input does not describe
 *   a valid reference.
 */
export function parsePageReference(
    start?: number,
    end?: number,
): PageReference | undefined {
    const pageStart = toPageNumber(start);
    if (pageStart === undefined) return undefined;

    if (end === undefined) return toPageReference(pageStart);

    const pageEnd = toPageNumber(end);
    if (pageEnd === undefined) return undefined;

    return pageStart <= pageEnd
        ? toPageReference(pageStart, pageEnd)
        : toPageReference(pageEnd, pageStart);
}

/**
 * Parses a loose {@link PageReferenceInput} into a validated, normalized {@link PageReference}.
 *
 * This is the object-shaped counterpart to {@link parsePageReference}. It is useful when page
 * metadata already arrives packaged as a single object, such as in loaders, parsers, frontmatter,
 * or catalog records.
 *
 * Validation and normalization are fully delegated to {@link parsePageReference}, so both public
 * entry points always share the same semantics.
 *
 * @param input
 *   Loose page-reference object to parse.
 * @returns
 *   A validated, normalized {@link PageReference}, or `undefined` when the input is missing or
 *   invalid.
 */
export const parsePageReferenceInput = (
    input?: PageReferenceInput,
): PageReference | undefined => parsePageReference(input?.start, input?.end);

/**
 * Formats a validated {@link PageReference} for inline bibliography display.
 *
 * This function assumes the input is already trusted. It does not validate, normalize, or reorder
 * bounds. Those responsibilities belong to the parsing functions.
 *
 * ## Formatting rules:
 *
 * - missing references return `undefined`;
 * - single pages render as `<singleLabel> n`; and
 * - ranges render as `<rangeLabel> start<separator>end`.
 *
 * When parsing preserved an explicit `{ start, end }` with equal bounds, formatting still renders
 * the result as a single page.
 *
 * @param pages
 *   Validated page reference to format.
 * @param options
 *   Optional formatting policy. Defaults to the module's inline bibliography convention.
 * @returns
 *   A formatted page label, or `undefined` when `pages` is missing.
 */
export function formatPageReference(
    pages?: PageReference,
    options: PageFormatOptions = DEFAULT_PAGE_FORMAT,
): string | undefined {
    if (!pages) return undefined;

    const isSinglePage = pages.end === undefined || pages.start === pages.end;

    return isSinglePage
        ? `${options.singleLabel} ${pages.start}`
        : `${options.rangeLabel} ${pages.start}${options.separator}${pages.end}`;
}
