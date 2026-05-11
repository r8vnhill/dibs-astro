import type { ExportRoute, LessonRoute } from "./manifest";

export interface DeriveExportRouteOptions {
    readonly prefix?: string;
}

const DEFAULT_EXPORT_ROUTE_PREFIX = "/exports/pdf";

export function normalizeLessonRoute(route: string): LessonRoute {
    return normalizeRouteLike(route, { allowIndexNormalization: true });
}

export function deriveExportRoute(route: string, options: DeriveExportRouteOptions = {}): ExportRoute {
    const normalizedRoute = normalizeLessonRoute(route);
    const prefix = normalizeExportRoutePrefix(options.prefix ?? DEFAULT_EXPORT_ROUTE_PREFIX);
    return `${prefix}${normalizedRoute}` as ExportRoute;
}

export function normalizeExportRoutePrefix(prefix: string): string {
    const normalizedPrefix = normalizeRouteLike(prefix, { allowIndexNormalization: false });

    if (normalizedPrefix === "/") {
        throw new Error("Export route prefix must not be the site root.");
    }

    if (normalizedPrefix.includes("/../") || normalizedPrefix.includes("/./")) {
        throw new Error("Export route prefix must not contain relative path segments.");
    }

    return normalizedPrefix.slice(0, -1);
}

function normalizeRouteLike(route: string, options: { readonly allowIndexNormalization: boolean }): string {
    if (typeof route !== "string") {
        throw new TypeError("Route must be a string.");
    }

    const trimmed = route.trim();
    if (trimmed.length === 0) {
        throw new Error("Route must not be empty.");
    }

    if (/[?#]/u.test(trimmed)) {
        throw new Error("Route must not include a query string or fragment.");
    }

    let normalized = trimmed.replace(/\/+/gu, "/");
    if (!normalized.startsWith("/")) {
        normalized = `/${normalized}`;
    }

    if (!normalized.endsWith("/")) {
        normalized = `${normalized}/`;
    }

    if (options.allowIndexNormalization) {
        normalized = normalized.replace(/\/index\/$/u, "/");
    }

    return normalized;
}
