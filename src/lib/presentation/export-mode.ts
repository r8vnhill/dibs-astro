/**
 * @file export-mode.ts
 *
 * Presentation-layer helper for resolving lesson render mode (web vs. export/PDF).
 *
 * This module provides:
 * - A narrow `LessonRenderMode` type to avoid boolean abstractions.
 * - A `LessonExportContext` interface to bundle render mode and convenience checks.
 * - A `resolveLessonExportContext` function for composing component behavior.
 * - Helper functions for common export markers.
 *
 * The design allows deeply nested Astro components to read export mode without prop drilling,
 * while keeping tests clean by preferring explicit props over Astro.locals simulation.
 *
 * Precedence for resolving render mode:
 * 1. Explicit component prop (`renderMode`).
 * 2. Legacy prop (`exportMode: true` maps to `"pdf"`).
 * 3. Request-scoped mode (`Astro.locals.lessonRenderMode`).
 * 4. Default to `"web"`.
 */

/**
 * Lesson render mode: whether components should produce web-interactive or export-deterministic HTML.
 */
export type LessonRenderMode = "web" | "pdf";

/**
 * Context for lesson rendering, resolved from props and request state.
 */
export interface LessonExportContext {
    /**
     * The resolved render mode.
     */
    readonly renderMode: LessonRenderMode;

    /**
     * Convenience check: true if renderMode is "pdf".
     */
    readonly isPdfExport: boolean;
}

/**
 * Input to the export context resolver.
 *
 * Allows callers to provide render mode via:
 * - Explicit modern prop (`renderMode`).
 * - Legacy compatibility prop (`exportMode: true` → `"pdf"`).
 * - Request-scoped value (`Astro.locals.lessonRenderMode`).
 * - Falls back to `"web"`.
 */
export interface ResolveLessonExportContextInput {
    /**
     * Modern render mode prop. Takes precedence over legacy props and locals.
     * Can be explicitly undefined to skip this prop and check the next option.
     */
    readonly renderMode?: LessonRenderMode | undefined;

    /**
     * Legacy compatibility prop. Maps to `"pdf"` if true. Overridden by modern `renderMode`.
     */
    readonly exportMode?: boolean | undefined;

    /**
     * Request-scoped render mode from `Astro.locals.lessonRenderMode`.
     * Used only if `renderMode` and `exportMode` are not supplied.
     */
    readonly locals?: App.Locals | undefined;
}

function isLessonRenderMode(value: unknown): value is LessonRenderMode {
    return value === "web" || value === "pdf";
}

/**
 * Resolve lesson export context from props and request state.
 *
 * Precedence:
 * 1. Explicit `renderMode` prop (highest priority).
 * 2. Legacy `exportMode: true` (maps to `"pdf"`).
 * 3. `Astro.locals.lessonRenderMode` (request-scoped).
 * 4. `"web"` (default).
 *
 * @example
 * ```ts
 * const context = resolveLessonExportContext({
 *     renderMode: Astro.props.renderMode,
 *     exportMode: Astro.props.exportMode,
 *     locals: Astro.locals,
 * });
 * const { renderMode, isPdfExport } = context;
 * ```
 */
export function resolveLessonExportContext(
    input: ResolveLessonExportContextInput,
): LessonExportContext {
    // Explicit modern prop wins.
    if (input.renderMode !== undefined) {
        const renderMode = input.renderMode;
        return {
            renderMode,
            isPdfExport: renderMode === "pdf",
        };
    }

    // Legacy exportMode prop.
    if (input.exportMode !== undefined) {
        return {
            renderMode: input.exportMode ? "pdf" : "web",
            isPdfExport: input.exportMode,
        };
    }

    // Request-scoped locals.
    if (input.locals?.lessonRenderMode !== undefined) {
        const renderMode = input.locals.lessonRenderMode;
        if (!isLessonRenderMode(renderMode)) {
            return {
                renderMode: "web",
                isPdfExport: false,
            };
        }

        return {
            renderMode,
            isPdfExport: renderMode === "pdf",
        };
    }

    // Default to web mode.
    return {
        renderMode: "web",
        isPdfExport: false,
    };
}

/**
 * Get document root attributes for exporting, if in PDF mode.
 *
 * Returns a set of attributes suitable for the document root element:
 * - `data-export-mode="pdf"` (if PDF export mode)
 * - `data-export-role="document"` (always present on the document root)
 *
 * @example
 * ```astro
 * const context = resolveLessonExportContext({ renderMode: Astro.props.renderMode });
 * ---
 * <article {...getLessonExportRootAttributes(context)}>
 * ```
 */
export function getLessonExportRootAttributes(
    context: LessonExportContext,
): Record<string, string | undefined> {
    const attributes: Record<string, string | undefined> = {
        "data-export-role": "document",
    };

    if (context.isPdfExport) {
        attributes["data-export-mode"] = "pdf";
    }

    return attributes;
}
