/**
 * Utilities for normalizing, merging, and managing CSS class tokens.
 *
 * These helpers support both `class` and `className` properties and normalize
 * various input formats (strings, arrays) into consistent class token arrays.
 */

/**
 * Acceptable class value inputs: strings, arrays, or falsy values.
 */
export type ClassValue = string | readonly string[] | null | undefined;

/**
 * Minimal node interface for class manipulation.
 *
 * Represents the `properties` bag from Shiki HAST-like nodes, supporting
 * both `class` and `className` properties for compatibility.
 */
export interface ClassableNode {
    properties: {
        class?: ClassValue;
        className?: ClassValue;
        [key: string]: unknown;
    };
}

/**
 * Splits a whitespace-separated class string into individual tokens.
 *
 * @param value the raw class string or undefined
 * @returns an array of trimmed, non-empty class tokens
 */
export const splitClassTokens = (value: string | undefined): string[] =>
    value?.split(/\s+/u).filter(Boolean) ?? [];

/**
 * Normalizes class values of various input types into a consistent token array.
 *
 * Supports:
 * - strings (split on whitespace)
 * - arrays of strings (flattened and tokenized)
 * - falsy values (converted to empty array)
 *
 * @param value the class value in any supported format
 * @returns an array of individual class tokens
 */
export const toClassTokens = (value: ClassValue): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap((item) => {
            if (Array.isArray(item)) {
                return toClassTokens(item);
            }
            return splitClassTokens(item);
        });
    }
    if (typeof value === "string") {
        return splitClassTokens(value);
    }
    return [];
};

/**
 * Merges two sets of classes, ensuring each token appears only once.
 *
 * Existing classes are preserved and maintain their relative order.
 * New classes are appended only if they are not already present.
 *
 * @param existing the current class value(s)
 * @param extras additional class value(s) to merge
 * @returns an array of unique, merged class tokens
 */
export const appendUniqueClasses = (
    existing: ClassValue,
    extras: ClassValue,
): string[] => {
    const classSet = new Set(toClassTokens(existing));
    for (const extra of toClassTokens(extras)) {
        classSet.add(extra);
    }
    return Array.from(classSet);
};

/**
 * Mutates a node to merge additional classes into its `className` property.
 *
 * Behavior:
 * - Reads from either `class` or `className` property
 * - Merges extras into that set
 * - Writes the result to `className`
 * - Removes the legacy `class` property
 *
 * This ensures compatibility with different HTML AST producers while normalizing
 * to a single property name.
 *
 * @param node the node to mutate
 * @param extras the class value(s) to append
 */
export const assignMergedClassName = (
    node: ClassableNode,
    extras: ClassValue,
): void => {
    node.properties.className = appendUniqueClasses(
        node.properties.className ?? node.properties.class,
        extras,
    );
    delete node.properties.class;
};
