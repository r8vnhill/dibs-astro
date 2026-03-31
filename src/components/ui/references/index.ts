/**
 * Public entrypoint for the references UI family.
 *
 * This barrel exposes the reusable bibliography presentation components together with the small
 * contract-error types that callers or tests may need to recognize explicitly. Importing from this
 * module keeps reference-related call sites stable even when individual files inside the family are
 * reorganized.
 */
export { default as AuthorList } from "./AuthorList.astro";
export { default as Book } from "./Book.astro";
export { default as GenericReference } from "./GenericReference.astro";
export { default as OfficialDocs } from "./OfficialDocs.astro";
export { MissingReferenceTitleError, ReferenceContractError } from "./ReferenceContractError";
export { default as References } from "./References.astro";
export { default as ReferencesFromCatalog } from "./ReferencesFromCatalog.astro";
export { default as ReferencesFromJsonLd } from "./ReferencesFromJsonLd.astro";
export { default as ScholarlyArticle } from "./ScholarlyArticle.astro";
export { default as Thesis } from "./Thesis.astro";
export { default as Video } from "./Video.astro";
export { default as WebPage } from "./WebPage.astro";
