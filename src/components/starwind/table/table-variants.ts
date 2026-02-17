import { tv } from "tailwind-variants";

/**
 * @file table-variants.ts
 *
 * Centralized Tailwind-Variants (`tv`) helpers used by the small table Astro/React components in
 * `src/components/starwind/table/`.
 *
 * Rationale:
 * - Keep markup-focused `.astro` files small by moving class/variant logic here.
 * - Provide well-documented defaults and variant names so callers don't guess the available options.
 * - Use CSS custom properties for row/spacer sizing so the same variant API can switch density without touching many
 *   classes.
 */

// Base classes shared by both header (`th`) and data (`td`) cells. These cover
// vertical alignment, base text sizing, and a few checkbox-specific layout
// adjustments (the `:has` selector targets rows containing selection checkboxes).
const baseCellClasses = [
    "align-middle text-sm",
    // Remove right padding when the cell contains a checkbox role (selection column)
    "[&:has([role=checkbox])]:pr-0",
    // Slight visual nudge to vertically center native checkbox inputs
    "[&>[role=checkbox]]:translate-y-[2px]",
];

/**
 * Variant maps used by both header and data cells.
 * - align: text alignment utilities
 * - wrap: control whether cell content wraps or stays on one line
 * - size: font-size variants used to tune compact/comfortable layouts
 */
const baseCellVariants = {
    align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
    },
    wrap: {
        nowrap: "whitespace-nowrap",
        normal: "whitespace-normal break-words",
    },
    size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
    },
} as const;

export type TableAlign = keyof typeof baseCellVariants.align;
export type TableWrap = keyof typeof baseCellVariants.wrap;
export type TableSize = keyof typeof baseCellVariants.size;
export type TableTone = "default" | "muted" | "accent";
export type TableZebra = "none" | "even" | "odd";
export type TableDensity = "compact" | "comfortable" | "spacious";

// Sensible defaults used by `tableDataCell` and `tableHeaderCell` so callers only
// need to pass variant keys when deviating from the baseline.
const baseCellDefaults = {
    align: "left",
    wrap: "nowrap",
    size: "md",
} as const;

/**
 * Variants for data cells (`<td>`).
 *
 * Adds a `tone` variant that provides semantic emphasis (muted / accent) while
 * preserving the base alignment/wrapping/size options.
 */
export const tableDataCell = tv({
    base: baseCellClasses,
    variants: {
        ...baseCellVariants,
        tone: {
            default: "",
            // muted reduces emphasis (useful for helper columns)
            muted: "text-muted-foreground",
            // accent gives a subtle background + strong foreground for highlighted cells
            accent: "bg-accent/20 text-foreground",
        },
    },
    defaultVariants: {
        ...baseCellDefaults,
        tone: "default",
    },
});

/**
 * Variants for header cells (`<th>`).
 *
 * The header cell reuses the same align/wrap/size variants but sets a
 * bolder default (small size + font-semibold) appropriate for table headers.
 */
export const tableHeaderCell = tv({
    base: [...baseCellClasses, "font-semibold text-muted-foreground"],
    variants: baseCellVariants,
    defaultVariants: {
        ...baseCellDefaults,
        size: "sm",
    },
});

/**
 * Structural variants for the table header section (`<thead>` / header rows).
 *
 * - `sticky` makes header cells sticky to the top (useful for long tables)
 * - `elevated` toggles a small shadow for visual separation
 */
export const tableHeaderSection = tv({
    base: [
        "[_&tr]:border-b",
        // Ensure header cells default to left-aligned bold text
        "[_&th]:text-left [&_th]:font-semibold",
        "bg-muted text-muted-foreground",
    ],
    variants: {
        sticky: {
            true: "[_&th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-sm",
            false: "",
        },
        elevated: {
            true: "shadow-sm",
            false: "",
        },
    },
    defaultVariants: {
        sticky: false,
        elevated: false,
    },
});

/**
 * Variants for the table body section (`<tbody>`).
 *
 * `zebra` enables striping by row (even/odd). Leave `none` as the default to
 * avoid introducing background noise unless explicitly requested.
 */
export const tableBodySection = tv({
    base: "[&_tr:last-child]:border-0",
    variants: {
        zebra: {
            none: "",
            even: "[&_tr:nth-child(even)]:bg-muted/50",
            odd: "[&_tr:nth-child(odd)]:bg-muted/50",
        },
    },
    defaultVariants: {
        zebra: "none",
    },
});

/**
 * Variants for the table foot (`<tfoot>`).
 *
 * Footers typically use a muted background and medium font weight to separate
 * totals/summary rows from the body. `muted` toggles the text color.
 */
export const tableFootSection = tv({
    base: "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
    variants: {
        muted: {
            true: "text-muted-foreground",
            false: "",
        },
    },
    defaultVariants: {
        muted: true,
    },
});

/**
 * Row-level styles and variants.
 *
 * Important: spacing for cells is controlled via CSS variables on the table row
 * (e.g. `--table-cell-px` / `--table-cell-py`). This makes implementing
 * different density options (compact/comfortable/spacious) inexpensive and
 * keeps the `td/th` declarations uniform.
 */
export const tableRowStyles = tv({
    base: [
        "border-b transition-colors",
        "data-[state=selected]:bg-muted",
        // Spacing controlled via CSS vars set on the table container, with fallbacks.
        "[&_td]:px-[var(--table-cell-px,0.75rem)] [&_td]:py-[var(--table-cell-py,0.5rem)]",
        "[&_th]:px-[var(--table-cell-px,0.75rem)] [&_th]:py-[var(--table-cell-py,0.5rem)]",
    ],
    variants: {
        intent: {
            default: "",
            clickable: "cursor-pointer hover:bg-accent/30",
            highlight: "bg-muted/50",
        },
        hoverable: {
            true: "hover:bg-muted/50",
            false: "",
        },
        density: {
            // Each density option simply sets the CSS vars used by the base spacing rules
            compact: "[--table-cell-px:0.5rem] [--table-cell-py:0.25rem]",
            comfortable: "[--table-cell-px:0.75rem] [--table-cell-py:0.5rem]",
            spacious: "[--table-cell-px:1rem] [--table-cell-py:0.75rem]",
        },
    },
    compoundVariants: [
        {
            intent: "clickable",
            hoverable: false,
            class: "hover:bg-accent/30",
        },
    ],
    defaultVariants: {
        intent: "default",
        hoverable: true,
    },
});
