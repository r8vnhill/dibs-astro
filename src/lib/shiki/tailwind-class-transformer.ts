/**
 * Shiki transformer for applying Tailwind CSS classes.
 *
 * This is a thin compatibility wrapper for the canonical implementations in `@ravenhill/shiki-core`.
 * It preserves the existing app import path during the Phase 2 migration.
 */

export {
    createTailwindClassTransformer,
    applyTailwindClasses,
    type TailwindClassTransformerOptions,
} from "@ravenhill/shiki-core";
