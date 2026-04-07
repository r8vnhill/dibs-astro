/**
 * @file inline-code-classes.ts
 *
 * Utilities for composing the CSS class list used by the `InlineCode` Astro component.
 *
 * This module keeps class composition separate from rendering so the styling contract can be:
 *
 * - reused by other components if needed,
 * - tested in isolation without rendering Astro markup, and
 * - evolved without coupling style decisions to template structure.
 *
 * The exported builder combines:
 *
 * - a stable base set of classes for inline code layout and wrapping,
 * - an optional “elevated” visual treatment, and
 * - user-provided classes appended at the end.
 *
 * Duplicate class tokens are removed while preserving insertion order.
 */

/**
 * Base classes applied to all inline code snippets.
 *
 * These classes define the default inline layout, typography, wrapping behavior, and transparent
 * background expected by the component.
 */
const baseInlineCodeClasses = Object.freeze([
    "inline-block",
    "align-[0.05em]",
    "leading-[1.4]",
    "text-[0.95em]",
    "font-mono",
    "[font-weight:inherit]",
    "rounded",
    "px-[2px]",
    "py-[0px]",
    "whitespace-normal",
    "break-words",
    "[overflow-wrap:anywhere]",
    "bg-transparent",
]);

/**
 * Additional classes used when the inline code should appear visually elevated.
 *
 * This variant adds a subtle bordered badge-like treatment while preserving the base inline layout.
 */
const elevatedInlineCodeClasses = Object.freeze([
    "border",
    "border-base-border/60",
    "bg-base-background/60",
    "px-1",
    "py-[1px]",
    "shadow-inner",
]);

/**
 * Options accepted by {@link buildInlineCodeClassList}.
 */
export interface InlineCodeClassOptions {
    /**
     * Additional classes appended to the generated class list.
     *
     * The value is trimmed before use. If it is empty or contains only whitespace, it is ignored.
     */
    className?: string;

    /**
     * Whether to include the elevated visual treatment.
     *
     * When enabled, the returned class list includes the tokens from `elevatedInlineCodeClasses`.
     *
     * @defaultValue `true`
     */
    elevate?: boolean;
}

/**
 * Builds the class list used by the inline code component.
 *
 * The result always includes the base inline-code classes. When `elevate` is enabled, the elevated
 * variant classes are appended. If `className` contains a non-empty value, it is added last so
 * callers can extend the styling contract.
 *
 * Duplicate tokens are removed with `Set`, preserving the first occurrence of each class.
 *
 * ## Usage:
 *
 * Usage details and scenarios.
 *
 * ### Example 1: Use the default inline-code styling
 *
 * ```ts
 * const classes = buildInlineCodeClassList();
 * ```
 *
 * ### Example 2: Disable the elevated appearance
 *
 * ```ts
 * const classes = buildInlineCodeClassList({ elevate: false });
 * ```
 *
 * ### Example 3: Append custom classes
 * 
 * ```ts
 * const classes = buildInlineCodeClassList({
 *   className: "text-red-500 underline",
 * });
 * ```
 *
 * @param options Configuration controlling how the class list is composed.
 * @param options.className Additional classes appended to the result.
 * @param options.elevate Whether to include the elevated variant classes.
 * @returns A readonly array of unique class tokens in stable order.
 */
export const buildInlineCodeClassList = ({
    className = "",
    elevate = true,
}: InlineCodeClassOptions = {}): readonly string[] => {
    const normalizedClassName = className.trim();

    return [
        ...new Set([
            ...baseInlineCodeClasses,
            ...(elevate ? elevatedInlineCodeClasses : []),
            ...(normalizedClassName ? [normalizedClassName] : []),
        ]),
    ];
};
