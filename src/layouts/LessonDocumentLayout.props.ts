/**
 * @file LessonDocumentLayout.props.ts
 *
 * Internal props contract for {@link LessonDocumentLayout}.
 *
 * This layout owns only the document-facing lesson composition. Browser-shell concerns such as
 * sidebar data, reading-time controls, and previous/next navigation stay in `NotesLayout`.
 */

import type { LessonMetaPanelMetadata } from "$presentation/adapters/lesson-metadata-panel";
import type { LessonRenderMode } from "~/lib/presentation/export-mode";
import type { RepoRef } from "@ravenhill/site-core";

/**
 * Props for the extracted lesson document layout.
 *
 * Data passed here is already resolved and ready to render. The layout does not derive route
 * metadata or course navigation on its own.
 */
export interface LessonDocumentLayoutProps {
    /**
     * Title of the current lesson.
     */
    title: string;

    /**
     * Optional lesson metadata payload rendered through `LessonMetaPanel`.
     */
    metadata?: LessonMetaPanelMetadata;

    /**
     * Optional repository references rendered through `LessonRepoPanel`.
     */
    git?: RepoRef | readonly RepoRef[];

    /**
     * Optional render mode for lesson output.
     *
     * Determines whether components produce web-interactive or export-deterministic HTML.
     *
     * Defaults to "web" if not provided or can be read from `Astro.locals.lessonRenderMode`.
     */
    renderMode?: LessonRenderMode;

    /**
     * @deprecated Use `renderMode: "pdf"` instead.
     *
     * Legacy compatibility prop. Maps to `renderMode: "pdf"` when true.
     */
    exportMode?: boolean;
}
