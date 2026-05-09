/**
 * Default theme and language configuration for @ravenhill/shiki-core.
 */

import { SHIKI_DEFAULT_THEMES } from "../themes/defaults";
import { availableLanguages } from "../languages/resolution";

/**
 * Default theme pair used across the project.
 */
export const DEFAULT_DARK_THEME = "catppuccin-mocha";
export const DEFAULT_LIGHT_THEME = "catppuccin-latte";

/**
 * Default themes for the highlighter.
 */
export const defaultThemes = SHIKI_DEFAULT_THEMES;

/**
 * Default languages to preload when creating the highlighter.
 */
export const defaultLanguages = availableLanguages;
