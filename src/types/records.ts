/**
 * @file types/records.ts
 *
 * Record-related utility types shared across the codebase.
 */

/**
 * A `Record` where every key is optional.
 *
 * This is useful when:
 * - You want a mapping for a known key union, but only some keys are present.
 * - You want to model “partial configuration” objects keyed by an enum/union.
 *
 * @example
 * const refs: PartialRecord<"github" | "gitlab", { user: string; repo: string }> = {
 *   github: { user: "org", repo: "web" },
 * };
 */
export type PartialRecord<K extends PropertyKey, T> = Partial<Record<K, T>>;
