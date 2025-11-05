type SortState = "none" | "asc" | "desc";

type BuildStateArgs = {
    scope?: HTMLTableCellElement["scope"];
    sort?: SortState;
    sortLabel?: string;
    showSortIcon?: boolean;
};

type TableHeadState = {
    scope: HTMLTableCellElement["scope"];
    sort: SortState;
    isSorted: boolean;
    ariaSort?: Exclude<SortState, "none">;
    srLabel?: string;
    showSortIcon: boolean;
};

const SORT_LABELS: Record<Exclude<SortState, "none">, string> = {
    asc: "Sorted ascending",
    desc: "Sorted descending",
};

/**
 * Collapses the sorting/scope props for TableHead into a normalized state that can be easily tested.
 * Consumers can import this helper in unit tests without rendering the Astro component.
 */
export function buildTableHeadState(args: BuildStateArgs = {}): TableHeadState {
    const scope = args.scope ?? "col";
    const sort = args.sort ?? "none";
    const isSorted = sort !== "none";
    const ariaSort = isSorted ? sort : undefined;
    const srLabel = isSorted ? (args.sortLabel ?? SORT_LABELS[sort]) : undefined;
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
