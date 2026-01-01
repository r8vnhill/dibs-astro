/**
 * Returns a random element from an array.
 *
 * @param arr Array to select from.
 * @returns A random element or `undefined` if the array is empty.
 */
export function pickRandom<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
}
