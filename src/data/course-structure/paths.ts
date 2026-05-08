/**
 * Joins a parent route and a child segment into a canonical course path.
 *
 * This helper keeps path composition consistent across the internal course registry by centralizing the
 * `${base}/${segment}` pattern in one place.
 *
 * It assumes that:
 *
 * - `base` already represents a canonical absolute path
 * - `segment` is a single clean path segment without leading or trailing slashes
 *
 * The function does not normalize duplicate separators, trim whitespace, or resolve relative path markers. Callers are
 * expected to pass already-sanitized values.
 *
 * This helper is intentionally local to this module because it exists only to build the canonical `coursePaths` tree.
 *
 * @param base Parent absolute path from which the child route is derived.
 * @param segment Child path segment to append to `base`.
 * @returns The canonical child path formed from `base` and `segment`.
 */
const joinPath = (base: string, segment: string): string => `${base}/${segment}`;

const notes = "/notes";
const softwareLibraries = joinPath(notes, "software-libraries");
const apiDesign = joinPath(softwareLibraries, "api-design");
const buildSystems = joinPath(softwareLibraries, "build-systems");
const scripting = joinPath(notes, "scripting");

/**
 * Canonical registry of lesson and section paths used by the internal course-structure modules.
 *
 * This tree is the single source of truth for URL strings referenced by modules such as `index.ts` and the
 * unit-specific lesson builders. Its shape mirrors the course hierarchy so that section locality in code matches
 * section locality in the generated lesson structure.
 *
 * Top-level entries represent either:
 *
 * - standalone canonical paths, such as `notes` or `installation`
 * - nested section objects that expose a `root` path plus their known child routes
 *
 * Nested sections follow the same convention recursively. For example, `softwareLibraries` exposes its own `root` and
 * also contains subsection registries such as `apiDesign` and `buildSystems`, each with their own `root` and leaf
 * lesson paths.
 *
 * The object is declared with `as const` so consumers can rely on literal path values instead of widened `string`
 * types. This improves type safety when other internal modules depend on concrete route values or on the structural
 * shape of the registry.
 *
 * This module intentionally stores only canonical paths. It does not encode lesson titles, ordering, breadcrumbs,
 * redirects, or other metadata that belong to higher-level course descriptors.
 */
export const coursePaths = {
    notes,
    installation: joinPath(notes, "installation"),
    softwareLibraries: {
        root: softwareLibraries,
        artifactsTaxonomy: joinPath(softwareLibraries, "artifacts-taxonomy"),
        whatIs: joinPath(softwareLibraries, "what-is"),
        taskAutomation: joinPath(softwareLibraries, "task-automation"),
        businessVsApp: joinPath(softwareLibraries, "business-vs-app"),
        domainModels: joinPath(softwareLibraries, "domain-models"),
        apiDesign: {
            root: apiDesign,
            fundamentals: joinPath(apiDesign, "fundamentals"),
            evolution: joinPath(apiDesign, "evolution"),
            documentation: joinPath(apiDesign, "documentation"),
        },
        buildSystems: {
            root: buildSystems,
            veritas1: joinPath(buildSystems, "veritas-1"),
        },
    },
    scriptingLibraries: {
        root: scripting,
        supportScripts: joinPath(scripting, "support-scripts"),
    },
} as const;

/**
 * Literal type of the canonical course path registry.
 *
 * This type preserves both the nested structure and the exact string literal values of {@link coursePaths}. Internal
 * callers can use it when they need to accept, constrain, or derive values from the path tree without duplicating its
 * shape manually.
 */
export type CoursePaths = typeof coursePaths;
