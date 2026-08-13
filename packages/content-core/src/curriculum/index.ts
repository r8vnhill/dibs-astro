/**
 * @packageDocumentation
 *
 * Internal barrel for the `curriculum` submodule.
 *
 * This module gathers the smallest coherent, host-agnostic curriculum data contract behind a single local boundary:
 *
 * - concepts, a minimal reusable identity a curriculum unit can reference;
 * - facets, a generic dimension-to-tags mechanism with no built-in vocabulary;
 * - units, the coherent treatment that groups concepts and facets with optional host-owned metadata.
 *
 * The curriculum layer describes data contracts only. It does not model relationships, traversal, validation, or any
 * concrete facet/language vocabulary — those remain host policy.
 *
 * Prefer importing from `@ravenhill/content-core` in application code. Importing from this internal path couples
 * consumers to the current package layout and makes future refactors harder.
 *
 * @example
 * ```typescript
 * import type { CurriculumConcept, CurriculumFacets, CurriculumUnit } from "@ravenhill/content-core";
 * ```
 */

// Minimal reusable concept identity a curriculum unit can reference.
export type { CurriculumConcept } from "./types";

// Generic facet dimensions; hosts define their own vocabulary, e.g. { level: ["advanced"] }.
export type { CurriculumFacets } from "./types";

// A coherent curriculum treatment grouping concepts and facets, with opaque host-owned metadata.
export type { CurriculumUnit } from "./types";
