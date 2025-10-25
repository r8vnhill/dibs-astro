/**
 * Runtime patch facade for `@astrojs/markdown-remark` Shiki highlighter.
 *
 * The implementation has been split across `config/patches/shiki/*` for
 * maintainability. Re-export the factory here so existing imports work
 * unchanged.
 */

export { createShikiHighlighter } from "./shiki/createShikiHighlighter";
