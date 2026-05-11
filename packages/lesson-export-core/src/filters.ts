import type { LessonExportManifest } from "./manifest";
import { normalizeLessonRoute } from "./routes";

export type LessonExportFilter =
    | { readonly kind: "all" }
    | { readonly kind: "exact-route"; readonly route: string }
    | { readonly kind: "subtree"; readonly routePrefix: string };

export function filterManifest(
    manifest: LessonExportManifest,
    filter: LessonExportFilter,
): LessonExportManifest {
    if (filter.kind === "all") {
        return { ...manifest, entries: [...manifest.entries] };
    }

    if (filter.kind === "exact-route") {
        const route = normalizeLessonRoute(filter.route);
        return {
            ...manifest,
            entries: manifest.entries.filter((entry) => normalizeLessonRoute(entry.route) === route),
        };
    }

    const routePrefix = normalizeLessonRoute(filter.routePrefix);
    return {
        ...manifest,
        entries: manifest.entries.filter((entry) => normalizeLessonRoute(entry.route).startsWith(routePrefix)),
    };
}
