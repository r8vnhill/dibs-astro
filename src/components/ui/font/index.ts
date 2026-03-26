/**
 * Barrel exports for the inline typography primitives used across notes and UI copy.
 *
 * Keep this module focused on the small, reusable presentational wrappers that authors commonly
 * compose inline (`B`, `I`, `Mono`, `Dash`, `Arrow`). Importing from this barrel keeps call sites
 * concise and makes it easier to standardize typography usage without coupling pages to individual
 * file paths.
 */
export { default as Arrow } from "./Arrow.astro";
export { default as B } from "./B.astro";
export { default as Dash } from "./Dash.astro";
export { default as I } from "./I.astro";
export { default as Mono } from "./Mono.astro";
