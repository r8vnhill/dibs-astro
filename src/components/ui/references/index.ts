/**
 * Public entrypoint for the references UI family.
 *
 * This barrel exposes the reusable bibliography presentation components together with the small
 * contract-error types that callers or tests may need to recognize explicitly. Importing from this
 * module keeps reference-related call sites stable even when individual files inside the family are
 * reorganized.
 *
 * Prefer `LessonReferencesFromCatalog` in lesson pages that only need to render references for the
 * current route from the shared bibliography catalog. Use `ReferencesFromCatalog` directly when a
 * call site needs non-default source control or custom `description-ref:*` slots.
 */
export { default as AuthorList } from "./AuthorList.astro";
export { default as Book } from "./Book.astro";
export { default as GenericReference } from "./GenericReference.astro";
export { default as LessonReferencesFromCatalog } from "./LessonReferencesFromCatalog.astro";
export { default as OfficialDocs } from "./OfficialDocs.astro";
export { MissingReferenceTitleError, ReferenceContractError } from "./ReferenceContractError";
export { default as References } from "./References.astro";
export { default as ReferencesFromCatalog } from "./ReferencesFromCatalog.astro";
export { default as ReferencesFromJsonLd } from "./ReferencesFromJsonLd.astro";
export { default as ScholarlyArticle } from "./ScholarlyArticle.astro";
export { default as Thesis } from "./Thesis.astro";
export { default as Video } from "./Video.astro";
export { default as WebPage } from "./WebPage.astro";
