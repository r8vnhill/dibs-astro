/**
 * Presentation-facing bridge for lesson readings data.
 *
 * This module is the approved import surface for pages that need the curated readings assigned to a lesson. It
 * centralizes the wiring to the concrete infrastructure adapter so pages do not import `src/data/readings` directly.
 *
 * Pages such as `notes/software-libraries/what-is/index.astro` and `readings/**` should import from this module
 * instead of importing from `~/data/readings/lesson-readings` directly.
 *
 * @see {@link LessonReadingsAdapter} for the concrete data adapter.
 */

export { getLibraryWhatIsReadings, getPublishedReadings } from "$infrastructure/adapters/LessonReadingsAdapter";
