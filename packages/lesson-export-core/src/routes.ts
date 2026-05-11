/**
 * @file Route normalization and export-route derivation for lesson exports.
 *
 * This module owns route-shaped values used by the lesson export planning package. It intentionally handles only 
 * site-relative route syntax:
 *
 * - {@link normalizeLessonRoute} canonicalizes route-shaped input to `/segment/segment/` form.
 * - {@link normalizeExportRoutePrefix} canonicalizes an export prefix such as `/exports/pdf`.
 * - {@link deriveExportRoute} combines both values into an export route.
 *
 * A {@link LessonRoute} means “a validated canonical route-shaped value used by lesson export planning”. It does not 
 * mean the route is already part of the supported course lesson route family, such as `/notes/**`. That higher-level
 * policy belongs to manifest validation.
 *
 * Routes must be site-relative. They must not contain absolute URL schemes, control characters, raw query strings, raw 
 * fragments, or relative path segments. Encoded query and fragment markers, such as `%3F` and `%23`, remain valid path 
 * text.
 */

import type { ExportRoute, LessonRoute } from "./manifest";

/**
 * Options for deriving an export route from a route-shaped lesson input.
 */
export interface DeriveExportRouteOptions {
    /**
     * Export route prefix. Defaults to `/exports/pdf`.
     */
    readonly prefix?: string;
}

/**
 * Internal options for normalizing route-shaped strings.
 */
interface NormalizeRouteLikeOptions {
    /**
     * Whether a trailing `/index/` segment should be collapsed into the parent route.
     */
    readonly allowIndexNormalization: boolean;
}

/** Default route prefix used for generated PDF export pages. */
const DEFAULT_EXPORT_ROUTE_PREFIX = "/exports/pdf";

/**
 * Canonicalizes a site-relative route-shaped string.
 *
 * The returned value is guaranteed to:
 *
 * - start with `/`;
 * - end with `/`;
 * - contain no duplicate slash runs;
 * - contain no raw query string or fragment markers;
 * - contain no `.` or `..` path segments;
 * - contain no control characters;
 * - not be an absolute URL.
 *
 * When the input ends in `/index/`, the suffix is collapsed into the parent route. For example, `/notes/setup/index/` 
 * becomes `/notes/setup/`.
 *
 * This function does not enforce the `/notes/**` route family. That validation is handled by manifest-oriented code.
 *
 * @param route Site-relative route-shaped input.
 * @returns Canonical branded lesson-export route value.
 * @throws {TypeError} If `route` is not a string at runtime.
 * @throws {Error} If `route` cannot be canonicalized safely.
 *
 * @example
 * ```ts
 * normalizeLessonRoute("notes/lesson");
 * // "/notes/lesson/"
 *
 * normalizeLessonRoute("/notes/lesson/index/");
 * // "/notes/lesson/"
 *
 * normalizeLessonRoute("  /custom//route  ");
 * // "/custom/route/"
 * ```
 */
export const normalizeLessonRoute = (route: string): LessonRoute =>
    asLessonRoute(normalizeRouteLike(route, { allowIndexNormalization: true }));

/**
 * Derives the export route for a canonicalized lesson-export route.
 *
 * The provided route and prefix are normalized internally before being joined. With the default prefix,
 * `/notes/lesson/` becomes `/exports/pdf/notes/lesson/`.
 *
 * @param route Site-relative route-shaped input.
 * @param options Optional export-route derivation options.
 * @returns Branded export route.
 * @throws {Error} If either the route or prefix cannot be canonicalized safely.
 *
 * @example
 * ```ts
 * deriveExportRoute("/notes/lesson/");
 * // "/exports/pdf/notes/lesson/"
 *
 * deriveExportRoute("notes/lesson", { prefix: "/exports/print" });
 * // "/exports/print/notes/lesson/"
 * ```
 */
export function deriveExportRoute(route: string, options: DeriveExportRouteOptions = {}): ExportRoute {
    const normalizedRoute = normalizeLessonRoute(route);
    const prefix = normalizeExportRoutePrefix(options.prefix ?? DEFAULT_EXPORT_ROUTE_PREFIX);
    return joinExportRoute(prefix, normalizedRoute);
}

/**
 * Canonicalizes an export route prefix.
 *
 * Export prefixes are site-relative base routes used to derive export pages. Unlike canonical route values, the 
 * returned prefix intentionally has no trailing slash so it can be joined with a normalized route suffix.
 *
 * A valid prefix:
 *
 * - is site-relative;
 * - is not the site root `/`;
 * - has no trailing slash in its returned form;
 * - has no raw query string or fragment;
 * - has no control characters;
 * - has no `.` or `..` path segments.
 *
 * @param prefix Site-relative export route prefix.
 * @returns Canonical prefix without a trailing slash.
 * @throws {TypeError} If `prefix` is not a string at runtime.
 * @throws {Error} If `prefix` cannot be canonicalized safely.
 *
 * @example
 * ```ts
 * normalizeExportRoutePrefix("/exports/pdf");
 * // "/exports/pdf"
 *
 * normalizeExportRoutePrefix("exports/pdf/");
 * // "/exports/pdf"
 *
 * normalizeExportRoutePrefix("/");
 * // throws
 * ```
 */
export function normalizeExportRoutePrefix(prefix: string): string {
    const normalizedPrefix = normalizeRouteLike(prefix, { allowIndexNormalization: false });

    if (normalizedPrefix === "/") {
        throw new Error("Export route prefix must not be the site root.");
    }

    if (containsRelativeSegment(normalizedPrefix)) {
        throw new Error("Export route prefix must not contain relative path segments.");
    }

    return removeTrailingSlash(normalizedPrefix);
}

/**
 * Canonicalizes route-shaped input with the shared route pipeline.
 *
 * The pipeline is deliberately split into small checks so route safety remains easy to test:
 *
 * 1. assert runtime string input;
 * 2. trim surrounding whitespace;
 * 3. reject empty input;
 * 4. reject absolute or protocol-like URLs;
 * 5. reject control characters;
 * 6. reject raw query strings and fragments;
 * 7. collapse duplicate slashes;
 * 8. ensure leading and trailing slashes;
 * 9. optionally normalize trailing `/index/`;
 * 10. reject relative path segments.
 *
 * @param route Route-shaped input.
 * @param options Normalization policy for this call site.
 * @returns Canonical route-shaped string.
 */
function normalizeRouteLike(route: string, options: NormalizeRouteLikeOptions): string {
    assertStringInput(route);

    const trimmed = route.trim();
    assertNonEmpty(trimmed);
    assertNotAbsoluteUrl(trimmed);
    assertNoControlCharacters(trimmed);
    assertNoRawQueryOrFragment(trimmed);

    let normalized = ensureTrailingSlash(ensureLeadingSlash(collapseDuplicateSlashes(trimmed)));
    if (options.allowIndexNormalization) {
        normalized = normalizeTrailingIndexRoute(normalized);
    }
    assertNoRelativeSegments(normalized);

    return normalized;
}

/**
 * Joins a normalized export prefix and lesson-export route.
 *
 * The prefix must not end with `/`; the route must start with `/`. Keeping this invariant in one helper prevents 
 * accidental double slashes or missing separators when export-route assembly changes later.
 *
 * @param prefix Canonical export prefix without a trailing slash.
 * @param route Canonical lesson-export route.
 * @returns Branded export route.
 */
function joinExportRoute(prefix: string, route: LessonRoute): ExportRoute {
    if (prefix.endsWith("/")) {
        throw new Error("Export route prefix must not end with '/'.");
    }

    if (!route.startsWith("/")) {
        throw new Error("Lesson route must start with '/'.");
    }

    return asExportRoute(`${prefix}${route}`, { prefix });
}

/**
 * Brands a canonical route-shaped string as a {@link LessonRoute}.
 *
 * This constructor guarantees only canonical route shape. It does not guarantee the route belongs to the supported
 * `/notes/**` family.
 *
 * @param normalized Canonical route-shaped string.
 * @returns Branded lesson-export route.
 */
function asLessonRoute(normalized: string): LessonRoute {
    assertCanonicalRouteShape(normalized);
    return normalized as LessonRoute;
}

/**
 * Brands a canonical route-shaped string as an {@link ExportRoute}.
 *
 * The value must already be joined with the normalized export prefix used by the caller.
 *
 * @param normalized Canonical export route candidate.
 * @param options Prefix constraint used for the export route.
 * @returns Branded export route.
 */
function asExportRoute(normalized: string, options: { readonly prefix: string }): ExportRoute {
    assertCanonicalRouteShape(normalized);
    if (!normalized.startsWith(`${options.prefix}/`)) {
        throw new Error("Export route must start with the normalized export prefix.");
    }

    return normalized as ExportRoute;
}

/**
 * Asserts that a route is in canonical slash-delimited shape.
 *
 * @param route Route-shaped value to inspect.
 * @throws {Error} If the route does not start and end with `/`.
 */
function assertCanonicalRouteShape(route: string): void {
    if (!route.startsWith("/") || !route.endsWith("/")) {
        throw new Error("Route must start and end with '/'.");
    }
}

/**
 * Asserts that runtime input is a string.
 *
 * Although TypeScript callers should already satisfy this statically, runtime checks keep the package safe when 
 * consumed from JavaScript.
 *
 * @param route Runtime route input.
 * @throws {TypeError} If the input is not a string.
 */
function assertStringInput(route: string): void {
    if (typeof route !== "string") {
        throw new TypeError("Route must be a string.");
    }
}

/**
 * Asserts that a trimmed route is not empty.
 *
 * @param route Trimmed route input.
 * @throws {Error} If the route is empty.
 */
function assertNonEmpty(route: string): void {
    if (route.length === 0) {
        throw new Error("Route must not be empty.");
    }
}

/**
 * Rejects absolute or protocol-like URL input.
 *
 * Route values in this package are site-relative paths. URL-looking values are rejected before duplicate slashes are 
 * collapsed so inputs such as `https://example.com/x` are not distorted into path-like strings.
 *
 * @param route Trimmed route input.
 * @throws {Error} If the route starts with a URL scheme.
 */
function assertNotAbsoluteUrl(route: string): void {
    if (/^[a-z][a-z0-9+.-]*:/iu.test(route)) {
        throw new Error("Route must be site-relative, not an absolute URL.");
    }
}

/**
 * Rejects ASCII control characters.
 *
 * @param route Trimmed route input.
 * @throws {Error} If the route contains U+0000–U+001F or U+007F.
 */
function assertNoControlCharacters(route: string): void {
    if (/[\u0000-\u001F\u007F]/u.test(route)) {
        throw new Error("Route must not contain control characters.");
    }
}

/**
 * Rejects raw query strings and raw fragments.
 *
 * Literal `?` and `#` are not allowed in route-shaped values. Encoded markers such as `%3F` and `%23` are treated as 
 * normal path text and remain allowed.
 *
 * @param route Trimmed route input.
 * @throws {Error} If the route contains `?` or `#`.
 */
function assertNoRawQueryOrFragment(route: string): void {
    if (/[?#]/u.test(route)) {
        throw new Error("Route must not include a query string or fragment.");
    }
}

/**
 * Collapses repeated slash runs into a single slash.
 *
 * @param route Route input after basic validation.
 * @returns Route with duplicate slash runs collapsed.
 */
const collapseDuplicateSlashes = (route: string): string => route.replace(/\/+/gu, "/");

/**
 * Ensures a route starts with `/`.
 *
 * @param route Route input after duplicate slash collapse.
 * @returns Route with a leading slash.
 */
const ensureLeadingSlash = (route: string): string => route.startsWith("/") ? route : `/${route}`;

/**
 * Ensures a route ends with `/`.
 *
 * @param route Route input with a leading slash.
 * @returns Route with a trailing slash.
 */
const ensureTrailingSlash = (route: string): string => route.endsWith("/") ? route : `${route}/`;

/**
 * Collapses a trailing `/index/` segment into the parent route.
 *
 * @param route Canonical slash-delimited route.
 * @returns Route with a trailing `/index/` suffix removed when present.
 */
const normalizeTrailingIndexRoute = (route: string): string =>
    route.endsWith("/index/") ? route.slice(0, -"index/".length) : route;

/**
 * Checks whether a route contains relative path segments.
 *
 * @param route Canonical slash-delimited route.
 * @returns `true` when any segment is `.` or `..`.
 */
const containsRelativeSegment = (route: string): boolean =>
    route.split("/").some((segment) => segment === "." || segment === "..");

/**
 * Asserts that a route does not contain relative path segments.
 *
 * @param route Canonical slash-delimited route.
 * @throws {Error} If any segment is `.` or `..`.
 */
function assertNoRelativeSegments(route: string): void {
    if (containsRelativeSegment(route)) {
        throw new Error("Route must not contain relative path segments.");
    }
}

/**
 * Removes the trailing slash from a canonical route.
 *
 * This helper is intended for export prefixes, which are stored without their trailing slash so they can be joined 
 * directly with normalized routes.
 *
 * @param route Canonical route with a trailing slash.
 * @returns Route without the final trailing slash.
 */
const removeTrailingSlash = (route: string): string => route.slice(0, -1);
