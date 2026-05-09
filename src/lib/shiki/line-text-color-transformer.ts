/**
 * Shiki transformer for applying per-line text colors.
 *
 * This is a thin compatibility wrapper for the canonical implementations in `@ravenhill/shiki-core`.
 * It preserves the existing app import path during the Phase 2 migration.
 */

export {
    createLineTextColorTransformer,
    transformerNotationLineTextColor,
} from "@ravenhill/shiki-core";
