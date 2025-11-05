import { tv } from "tailwind-variants";

const baseCellClasses = [
  "align-middle text-sm",
  "[&:has([role=checkbox])]:pr-0",
  "[&>[role=checkbox]]:translate-y-[2px]",
];

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

const baseCellDefaults = {
  align: "left",
  wrap: "nowrap",
  size: "md",
} as const;

/**
 * Variants for data cells (`<td>`). Includes tone control for semantic emphasis.
 */
export const tableDataCell = tv({
  base: baseCellClasses,
  variants: {
    ...baseCellVariants,
    tone: {
      default: "",
      muted: "text-muted-foreground",
      accent: "bg-accent/20 text-foreground",
    },
  },
  defaultVariants: {
    ...baseCellDefaults,
    tone: "default",
  },
});

/**
 * Variants for header cells (`<th>`). Adds bold styling and keeps alignment options.
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
 * Shared variant helpers for the structural table wrappers (thead/tbody/tfoot/tr).
 * Exporting them keeps the `.astro` files focused on props + markup.
 */
export const tableHeaderSection = tv({
  base: [
    "[&_tr]:border-b",
    "[&_th]:text-left [&_th]:font-semibold",
    "bg-muted text-muted-foreground",
  ],
  variants: {
    sticky: {
      true: "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-sm",
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
