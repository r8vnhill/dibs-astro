/**
 * @deprecated Consider importing theme constants from where they're needed.
 *
 * This module is part of the Phase 4 compatibility bridge. It will be removed in Phase 6.
 */

import type { BundledTheme } from "shiki";

export const SHIKI_DEFAULT_THEMES = [
    "catppuccin-latte",
    "catppuccin-mocha",
] as const satisfies readonly BundledTheme[];
 