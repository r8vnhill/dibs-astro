/**
 * @file table-variants.ts
 *
 * Centralized Tailwind-Variants (`tv`) helpers used by the table components in:
 * `src/components/starwind/table/`
 *
 * This module defines **all structural and visual table styling logic** in one place. Components
 * remain markup-focused while this file owns:
 *
 * - Variant names and allowed values
 * - Sensible defaults
 * - Density control via CSS custom properties
 * - Structural behavior (sticky headers, zebra striping, row intent, etc.)
 *
 * ## Design Principles
 *
 * 1. **Declarative variant API**: Callers never pass raw class names --- only typed variant keys.
 * 2. **Strong typing**: All variant keys are exported as TypeScript unions derived from config.
 * 3. **Density via CSS variables**: Cell spacing is controlled at the row level using CSS variables
 *    (`--table-cell-px`, `--table-cell-py`), so spacing can change without duplicating padding
 *    utilities across every cell.
 * 4. **Separation of concerns**:
 *    - Cell helpers style `<td>` and `<th>`
 *    - Section helpers style `<thead>`, `<tbody>`, `<tfoot>`
 *    - Row helper manages interactivity + density
 *
 * This structure keeps the system extensible and testable.
 */

import { tv, type VariantProps } from "tailwind-variants";

// ## Shared Cell Foundations ##

/**
 * Base classes shared by both header (`<th>`) and data (`<td>`) cells.
 *
 * Responsibilities:
 * - Vertical alignment
 * - Checkbox column layout corrections
 * - Minor visual alignment for checkbox inputs
 */
const baseCellClasses = [
    "align-middle",

    /**
     * If a cell contains a checkbox role (typically a selection column), remove right padding to
     * visually align the checkbox column.
     */
    "[&:has([role=checkbox])]:pr-0",

    /**
     * Slight vertical adjustment to center native checkbox inputs within the cell line box.
     */
    "[&>[role=checkbox]]:translate-y-[2px]",
];

/**
 * Core cell variants reused by both `<td>` and `<th>`.
 *
 * - align -> horizontal alignment
 * - wrap  -> wrapping behavior
 * - size  -> text size scale
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

/**
 * Horizontal alignment options for cells.
 */
export type TableAlign = keyof typeof baseCellVariants.align;

/**
 * Wrapping behavior for cell content.
 */
export type TableWrap = keyof typeof baseCellVariants.wrap;

/**
 * Font size scale used in cells.
 */
export type TableSize = keyof typeof baseCellVariants.size;

// ## Semantic Variants ##

/**
 * Visual tone variants for data cells.
 *
 * - default -> no additional emphasis
 * - muted   -> reduced emphasis (secondary data)
 * - accent  -> highlighted cell (important values)
 */
const toneVariants = {
    default: "",
    muted: "text-muted-foreground",
    accent: "bg-accent/20 text-foreground",
} as const;

/**
 * Zebra striping options for table bodies.
 */
const zebraVariants = {
    none: "",
    even: "[&_tr:nth-child(even)]:bg-muted/50",
    odd: "[&_tr:nth-child(odd)]:bg-muted/50",
} as const;

/**
 * Utility for defining density spacing via CSS variables.
 *
 * This avoids repeating padding utilities across cells and centralizes spacing logic.
 */
const densityVars = (px: string, py: string): string =>
    `[--table-cell-px:${px}] [--table-cell-py:${py}]`;

/**
 * Density variants that adjust cell padding.
 */
const densityVariants = {
    compact: densityVars("0.5rem", "0.25rem"),
    comfortable: densityVars("0.75rem", "0.5rem"),
    spacious: densityVars("1rem", "0.75rem"),
} as const;

/**
 * Data cell tone options.
 */
export type TableTone = keyof typeof toneVariants;

/**
 * Zebra striping modes.
 */
export type TableZebra = keyof typeof zebraVariants;

/**
 * Row density options.
 */
export type TableDensity = keyof typeof densityVariants;

// ## Defaults ##

/**
 * Default cell configuration applied unless overridden.
 */
const baseCellDefaults = {
    align: "left",
    wrap: "nowrap",
    size: "md",
} as const;

// ## Cell Variants ##

/**
 * Variants for data cells (`<td>`).
 *
 * Guarantees:
 * - Alignment defaults to `left`
 * - Content defaults to `nowrap`
 * - Text defaults to `md`
 * - Tone defaults to `default`
 */
export const tableDataCell = tv({
    base: baseCellClasses,
    variants: {
        ...baseCellVariants,
        tone: toneVariants,
    },
    defaultVariants: {
        ...baseCellDefaults,
        tone: "default",
    },
});

/**
 * Variants for header cells (`<th>`).
 *
 * Differences from data cells:
 * - Defaults to smaller text size
 * - Applies `font-semibold`
 */
export const tableHeaderCell = tv({
    base: [...baseCellClasses, "font-semibold"],
    variants: baseCellVariants,
    defaultVariants: {
        ...baseCellDefaults,
        size: "sm",
    },
});

// ## Section Variants ##

/**
 * Variants for `<thead>` or header sections.
 *
 * Options:
 * - sticky   -> header cells become position: sticky
 * - elevated -> applies subtle shadow for visual separation
 */
export const tableHeaderSection = tv({
    base: [
        "[_&tr]:border-b",
        "[_&th]:text-left [_&th]:font-semibold",
        "bg-muted text-muted-foreground",
    ],
    variants: {
        sticky: {
            true: "[_&th]:sticky [_&th]:top-0 [_&th]:z-10 [_&th]:bg-background",
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
 * Variants for `<tbody>`.
 *
 * Enables optional zebra striping.
 */
export const tableBodySection = tv({
    base: "[&_tr:last-child]:border-0",
    variants: {
        zebra: zebraVariants,
    },
    defaultVariants: {
        zebra: "none",
    },
});

/**
 * Variants for `<tfoot>`.
 *
 * Designed for totals or summary rows.
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

// ## Row-Level Variants ##

/**
 * Variants for table rows (`<tr>`).
 *
 * Responsibilities:
 * - Border + transition styling
 * - Selection state styling
 * - Hover behavior
 * - Density via CSS custom properties
 */
export const tableRowStyles = tv({
    base: [
        "border-b transition-colors",
        "data-[state=selected]:bg-muted",
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
        density: densityVariants,
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

// ## Public Variant Prop Types ##

/**
 * Variant props for data cells.
 */
export type TableDataCellProps = VariantProps<typeof tableDataCell>;

/**
 * Variant props for header cells.
 */
export type TableHeaderCellProps = VariantProps<typeof tableHeaderCell>;

/**
 * Variant props for header sections (`<thead>`).
 */
export type TableHeaderSectionProps = VariantProps<typeof tableHeaderSection>;

/**
 * Variant props for body sections (`<tbody>`).
 */
export type TableBodySectionProps = VariantProps<typeof tableBodySection>;

/**
 * Variant props for foot sections (`<tfoot>`).
 */
export type TableFootSectionProps = VariantProps<typeof tableFootSection>;

/**
 * Variant props for table rows (`<tr>`).
 */
export type TableRowStylesProps = VariantProps<typeof tableRowStyles>;
