/**
 * Public link-component barrel.
 *
 * This module exposes three related categories of links:
 *
 * - `Link`: the general-purpose internal/external link primitive;
 * - `LangLink`: the shared presentational wrapper for language-choice chips; and
 * - specialized language wrappers such as `PythonLink`, `NushellLink`, `NodeLink`, `BashLink`,
 *   and `FishLink`, which only bind naming, iconography, and trailing-slash route resolution for
 *   a specific comparative lesson.
 *
 * Keep new language-specific links thin. Route normalization should stay in `helpers.ts`, while
 * the visual contract remains centralized in `LangLink.astro`.
 */
export { default as BashLink } from "./BashLink.astro";
export { default as DibsSourceLink } from "./DibsSourceLink.astro";
export { default as FishLink } from "./FishLink.astro";
export { default as LangLink } from "./LangLink.astro";
export { default as Link } from "./Link.astro";
export { default as NodeLink } from "./NodeLink.astro";
export { default as NushellLink } from "./NushellLink.astro";
export { default as PythonLink } from "./PythonLink.astro";
