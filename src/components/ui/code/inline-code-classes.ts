const baseInlineCodeClasses = [
    "inline-block",
    "align-[0.05em]",
    "leading-[1.4]",
    "text-[0.95em]",
    "font-mono",
    "rounded",
    "px-[2px]",
    "py-[0px]",
    "whitespace-normal",
    "break-words",
    "[overflow-wrap:anywhere]",
    "bg-transparent",
];

const elevatedInlineCodeClasses = [
    "rounded",
    "border",
    "border-base-border/60",
    "bg-base-background/60",
    "px-1",
    "py-[1px]",
    "shadow-inner",
];

export interface InlineCodeClassOptions {
    className?: string;
    elevate?: boolean;
}

export function buildInlineCodeClassList({
    className = "",
    elevate = true,
}: InlineCodeClassOptions = {}): string[] {
    return [
        ...baseInlineCodeClasses,
        ...(elevate ? elevatedInlineCodeClasses : []),
        ...(className.trim() ? [className] : []),
    ];
}
