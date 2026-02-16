/**
 * Central export barrel for shared utility helpers and utility types.
 *
 * This file groups utilities by concern so callers can import from `~/utils` without needing to
 * know each module path.
 *
 * Example:
 * `import { resolveAutoNav, formatLessonDate, site } from "~/utils";`
 */

// Heading/semantics helpers
export type { HeadingLevel } from "./heading-level.ts";

// Lesson metadata runtime helpers (generated JSON resolution + formatting)
export {
    DEFAULT_LOCALE,
    formatDate,
    formatLessonDate,
    getLessonMetadataDataset,
    normalizeLessonPathname,
    parseIsoShortDate,
    parseLessonMetadataDataset,
    resolveLessonMetadata,
    UNKNOWN_DATE_LABEL,
} from "./lesson-metadata.ts";

// Lesson navigation helpers
export { normalizeNavigation, resolveAutoNav } from "./navigation.ts";

// Generic utilities
export { pickRandom } from "./random.ts";
export { site } from "./site.ts";
export type { default as StyledComponent } from "./styled-component.ts";

// Theme utilities
export {
    applyTheme,
    getColorSchemeMediaQuery,
    isDarkModePreferred,
    type Theme,
    theme,
} from "./theme.ts";
