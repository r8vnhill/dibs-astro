/**
 * @file src/env.d.ts
 *
 * Global type declarations for the Astro application.
 *
 * This file extends Astro's default type definitions with project-specific types,
 * including application locals and request-scoped data.
 */

/// <reference types="astro/client" />
/// <reference types="astro/env" />

declare global {
    namespace App {
        /**
         * Request-scoped data accessible through `Astro.locals`.
         *
         * This namespace is available in Astro middleware and can be used to inject
         * render-time context such as the lesson export mode for PDF generation.
         */
        interface Locals {
            /**
             * Lesson render mode for the current request.
             *
             * Set by middleware or export routes to switch component rendering between
             * web-interactive mode (default) and deterministic PDF export mode.
             *
             * Used by presentation helpers like `resolveLessonExportContext()` to
             * branch component output without prop drilling.
             */
            lessonRenderMode?: import("~/lib/presentation/export-mode").LessonRenderMode;
        }
    }
}

export {};
