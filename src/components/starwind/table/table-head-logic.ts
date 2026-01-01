/**
 * @file table-head-logic.ts
 * @description Utility to normalize TableHead props (scope, sorting, labels, and icon visibility) into a single,
 * testable shape used by the component.
 * This keeps the component runtime very small and makes the behavior easy to assert from unit tests without rendering.
 */

/**
 * Sorting state used by the table head.
 * - "none": not sorted
 * - "asc": sorted ascending
 * - "desc": sorted descending
 */
type SortState = "none" | "asc" | "desc";

/**
 * Optional inputs used to build the normalized `TableHeadState`.
 */
type BuildStateArgs = {
    /** Typically "col" or "row". */
    scope?: HTMLTableCellElement["scope"];
    /** Sorting state: "none" | "asc" | "desc". */
    sort?: SortState;
    /** Optional custom screen-reader label. */
    sortLabel?: string;
    /** Whether to show the sort affordance. */
    showSortIcon?: boolean;
};

/**
 * Normalized state produced by `buildTableHeadState` and consumed by the `TableHead` component and unit tests.
 */
type TableHeadState = {
    /** Cell scope attribute ("col" | "row"). */
    scope: HTMLTableCellElement["scope"];
    /** Current sort state. */
    sort: SortState;
    /** True when `sort` !== "none". */
    isSorted: boolean;
    /** ARIA sort value when sorted ("asc" | "desc"). */
    ariaSort?: Exclude<SortState, "none"> | undefined;
    /** Screen-reader label when sorted. */
    srLabel?: string | undefined;
    /** Whether to show the sort affordance. */
    showSortIcon: boolean;
};

/**
 * Default text alternatives used when a consumer doesn't provide `sortLabel`.
 * These are plain English defaults; consumers should override for i18n.
 */
const SORT_LABELS: Record<Exclude<SortState, "none">, string> = {
    asc: "Sorted ascending",
    desc: "Sorted descending",
};

/**
 * Collapses the sorting/scope props for `TableHead` into a normalized state.
 *
 * @param {BuildStateArgs} [args={}] - Optional inputs from the component.
 * @param {HTMLTableCellElement['scope']} [args.scope] - Cell scope, typically "col" or "row". Defaults to "col".
 * @param {SortState} [args.sort] - Sorting state: "none" | "asc" | "desc". Defaults to "none".
 * @param {string} [args.sortLabel] - Optional custom screen-reader label to announce the sorting state. Falls back to
 *   internal labels when omitted.
 * @param {boolean} [args.showSortIcon] - Whether to render the sort icon when the column is sorted. Defaults to
 *   `true` when sorted.
 *
 * @returns {TableHeadState} Normalized state the `TableHead` component can consume directly (and unit tests can
 *   assert).
 */
export function buildTableHeadState(args: BuildStateArgs = {}): TableHeadState {
    const scope = args.scope ?? "col";
    const sort = args.sort ?? "none";

    // Quick derived flags used by the component to render ARIA attributes and visuals. We intentionally compute these
    // in plain JS so they remain easy to test and reason about.
    const isSorted = sort !== "none";

    // `ariaSort` is only set when the column is sorted — otherwise leave it undefined so the rendered element won't
    // have an incorrect ARIA state.
    const ariaSort = isSorted ? sort : undefined;

    // `srLabel` is a small convenience for screen reader text. If the consumer passed a custom `sortLabel` use it;
    // otherwise fall back to the human-friendly defaults defined above.
    const srLabel = isSorted ? (args.sortLabel ?? SORT_LABELS[sort]) : undefined;

    // Show the sort icon by default when the column is sorted unless consumer
    // explicitly provided `showSortIcon: false`.
    const showSortIcon = isSorted ? args.showSortIcon ?? true : false;

    return {
        scope,
        sort,
        isSorted,
        ariaSort,
        srLabel,
        showSortIcon,
    };
}

export type { SortState, TableHeadState };
