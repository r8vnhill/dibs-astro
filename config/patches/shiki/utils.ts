/*
 * Small helper utilities used by the shiki patch modules.
 *
 * normalizePropAsString:
 * - Accepts either a string or an array of strings (or unknown input).
 * - If given an array, it joins items with a single space to produce a class-like string (useful for normalizing HTML
 *   attributes written as array or string). If given a string, it returns the string as-is.
 * - Returns `undefined` when the input is neither a string nor an array (the caller can treat `undefined` as "no value
 *   provided").
 *
 * Example:
 * - `normalizePropAsString(['a','b'])` -> 'a b'
 * - `normalizePropAsString('a b')` -> 'a b'
 */
export function normalizePropAsString(value: unknown): string | undefined {
    return Array.isArray(value) ? value.join(" ") : (value as string | undefined);
}
