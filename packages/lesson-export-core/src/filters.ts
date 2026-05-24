import type { LessonExportManifest, LessonExportEntry, LessonRoute } from "./manifest";
import { normalizeLessonRoute } from "./routes";

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

export function filterManifest(
    manifest: LessonExportManifest,
    filter: LessonExportFilter,
): LessonExportManifest {
    return {
        ...manifest,
        entries: filterEntries(manifest.entries, filter),
    };
}
