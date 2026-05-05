import {
    formatPageReference as formatCorePageReference,
    isPageReference as isCorePageReference,
    isValidPageNumber as isCoreValidPageNumber,
    parsePageReference as parseCorePageReference,
    parsePageReferenceInput as parseCorePageReferenceInput,
} from "./pages-core.mjs";

/**
 * Loose page-reference shape accepted at module boundaries.
 *
 * Use this type for data that comes from bibliography parsers, catalog loaders, frontmatter, or
 * any other source that has not been validated yet.
 *
 * It intentionally permits incomplete or invalid values, including:
 *
 * - missing bounds;
 * - non-page numeric values;
 * - non-numeric values from decoded metadata; and
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
    start?: unknown;
    end?: unknown;
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
 * by overriding one or more fields:
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
 * Typed bindings for the shared runtime implementation.
 *
 * The JavaScript core owns page-reference behavior for both catalog scripts and the Astro/UI
 * facade. These casts keep TypeScript's trust brand at the public boundary without duplicating the
 * runtime predicates and parsers.
 */
const formatCore = formatCorePageReference as (
    pages?: PageReference,
    options?: Partial<PageFormatOptions>,
) => string | undefined;
const isCorePageReferenceTyped = isCorePageReference as (
    value: unknown,
) => value is PageReference;
const isCoreValidPageNumberTyped = isCoreValidPageNumber as (
    value: unknown,
) => value is number;
const parseCorePageReferenceTyped = parseCorePageReference as (
    start?: unknown,
    end?: unknown,
) => PageReference | undefined;
const parseCorePageReferenceInputTyped = parseCorePageReferenceInput as (
    input?: unknown,
) => PageReference | undefined;

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
 * @param value Value to validate.
 * @returns `true` when `value` is a valid page number.
 */
export const isValidPageNumber = isCoreValidPageNumberTyped;

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
export const isPageReference = isCorePageReferenceTyped;

/**
 * Parses raw page bounds into a validated, normalized {@link PageReference}.
 *
 * This is the main constructor for trusted page-reference values built from loose numeric bounds.
 *
 * ## Normalization rules:
 *
 * - missing `start` returns `undefined`;
 * - invalid numeric bounds return `undefined`;
 * - non-numeric bounds return `undefined`;
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
    start?: unknown,
    end?: unknown,
): PageReference | undefined {
    return parseCorePageReferenceTyped(start, end);
}

/**
 * Parses a loose {@link PageReferenceInput} into a validated, normalized {@link PageReference}.
 *
 * This is the object-shaped counterpart to {@link parsePageReference}. It is useful when page
 * metadata already arrives packaged as a single object, such as in loaders, parsers, frontmatter,
 * or catalog records.
 *
 * Non-object values and arrays are rejected before reading `start` and `end`. Validation and
 * normalization are then delegated to the shared runtime parser, so both public entry points share
 * the same numeric page semantics.
 *
 * @param input
 *   Loose page-reference object to parse.
 * @returns
 *   A validated, normalized {@link PageReference}, or `undefined` when the input is missing or
 *   invalid.
 */
export const parsePageReferenceInput = (
    input?: unknown,
): PageReference | undefined => parseCorePageReferenceInputTyped(input);

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
 * - ranges render as `<rangeLabel> start<separator>end`; and
 * - partial format options are merged with the module defaults.
 *
 * When parsing preserved an explicit `{ start, end }` with equal bounds, formatting still renders
 * the result as a single page.
 *
 * @param pages
 *   Validated page reference to format.
 * @param options
 *   Optional partial formatting policy. Omitted fields fall back to the module's inline
 *   bibliography convention.
 * @returns
 *   A formatted page label, or `undefined` when `pages` is missing.
 */
export function formatPageReference(
    pages?: PageReference,
    options?: Partial<PageFormatOptions>,
): string | undefined {
    return formatCore(pages, options);
}
