import type { LessonExportManifest, LessonExportEntry, LessonRoute } from "./manifest";
import { normalizeLessonRoute } from "./routes";

/**
 * Selects which manifest entries a host adapter should export.
 *
 * @remarks
 * Route-shaped filter values accept the same loose input as {@link normalizeLessonRoute}.
 * Subtree filters include descendants of the normalized prefix and exclude the prefix
 * route itself.
 */
export type LessonExportFilter =
    | { readonly kind: "all" }
    | { readonly kind: "exact-route"; readonly route: string }
    | { readonly kind: "subtree"; readonly routePrefix: string };

const isDescendantRoute = (
    route: LessonRoute,
    routePrefix: LessonRoute,
): boolean => route !== routePrefix && route.startsWith(routePrefix);

const filterEntries = (
    entries: readonly LessonExportEntry[],
    filter: LessonExportFilter,
): LessonExportEntry[] => {
    switch (filter.kind) {
        case "all":
            return [...entries];

        case "exact-route": {
            const route = normalizeLessonRoute(filter.route);
            return entries.filter((entry) => entry.route === route);
        }

        case "subtree": {
            const routePrefix = normalizeLessonRoute(filter.routePrefix);
            return entries.filter((entry) => isDescendantRoute(entry.route, routePrefix));
        }

        default: {
            const _: never = filter;
            return _;
        }
    }
};

/**
 * Returns a manifest copy with entries selected by the requested filter.
 *
 * @remarks
 * The original manifest and entries array are left untouched. Manifest metadata is
 * preserved, while `entries` is always a new array, including for `all` filters and
 * empty results.
 *
 * @param manifest Manifest whose entries should be filtered.
 * @param filter Selection rule to apply to the manifest entries.
 * @returns A manifest copy with preserved metadata and a new filtered entries array.
 */
export function filterManifest(
    manifest: LessonExportManifest,
    filter: LessonExportFilter,
): LessonExportManifest {
    return {
        ...manifest,
        entries: filterEntries(manifest.entries, filter),
    };
}
