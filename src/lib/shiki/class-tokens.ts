/**
 * CSS class token normalization and merging utilities.
 *
 * This is a thin compatibility wrapper for the canonical implementations in `@ravenhill/shiki-core`.
 * It preserves the existing app import path during the Phase 2 migration.
 */

export {
    type ClassValue,
    type ClassableNode,
    splitClassTokens,
    toClassTokens,
    appendUniqueClasses,
    assignMergedClassName,
} from "@ravenhill/shiki-core";
