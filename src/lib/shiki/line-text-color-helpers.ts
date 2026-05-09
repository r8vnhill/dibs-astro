/**
 * Line-based text color directive helpers.
 *
 * This is a thin compatibility wrapper for the canonical implementations in `@ravenhill/shiki-core`.
 * It preserves the existing app import path during the Phase 2 migration.
 */

export {
    type ParsedLineColorDirective,
    getMetaKey,
    sanitizeCssColor,
    parseInlineLineColorDirective,
    appendInlineStyle,
} from "@ravenhill/shiki-core";
