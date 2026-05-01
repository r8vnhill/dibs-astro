/**
 * Presentation-facing bridge for the default bibliography catalog.
 *
 * This module is the approved import surface for presentation code that needs access to bibliography entries. It 
 * centralizes the wiring to the concrete infrastructure adapter so components do not import catalog data, loaders, or
 * infrastructure modules directly.
 *
 * The bridge keeps reference-rendering components focused on presentation by:
 *
 * - hiding the concrete bibliography catalog source;
 * - exposing only the catalog lookup API needed by UI consumers;
 * - preserving a stable import path if the catalog source changes later;
 * - making the intentional presentation-to-infrastructure seam easy to audit.
 *
 * Components such as `ReferencesFromCatalog.astro` should import from this module instead of importing from `src/data/
 * bibliography/catalog` or from the infrastructure adapter directly.
 *
 * @see {@link BibliographyCatalogAdapter} for the concrete catalog adapter.
 */

export { getDefaultBibliographyCatalog } from "$infrastructure/adapters/BibliographyCatalogAdapter";
