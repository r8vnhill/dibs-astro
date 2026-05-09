/**
 * @file NotesLayout.props.ts
 *
 * Public props contract for {@link NotesLayout}.
 *
 * This module defines the props interface shared between the layout component and its tests.
 * Keeping props in a separate file prevents duplication and makes it clear when the layout
 * contract evolves.
 */

import type { NavigationLinkInput } from "$presentation/adapters/navigation-normalization";
import type { RepoRef } from "@ravenhill/site-core";

/**
 * Props for the NotesLayout component.
 *
 * Lesson pages pass these values from frontmatter. The layout intentionally keeps the
 * navigation payload small (`title` + `href`) so pages can override navigation without
 * depending on the full course-structure lesson shape.
 */
export interface NotesLayoutProps {
    /**
     * Title of the current lesson.
     *
     * Rendered as the `<h1>` and used as the page title within `BaseLayout`.
     */
    title: string;

    /**
     * Short lesson description for SEO and social previews.
     *
     * Forwarded to `BaseLayout`.
     */
    description?: string;

    /**
     * Optional previous lesson navigation override.
     *
     * When an array is provided, every entry is rendered as its own "previous" button in the
     * order received. If omitted, the layout attempts to auto-resolve a single previous lesson
     * from the course structure.
     *
     * When supplied (either as a single link or array), manual previous links **completely replace**
     * auto-resolved previous navigation. They are not merged with auto navigation.
     */
    previous?: NavigationLinkInput | readonly NavigationLinkInput[];

    /**
     * Optional next lesson navigation override.
     *
     * If omitted, the layout attempts to auto-resolve it from the course structure.
     *
     * When supplied, manual next link **completely replaces** auto-resolved next navigation.
     */
    next?: NavigationLinkInput;

    /**
     * Multiplier applied to the reading-time estimate.
     *
     * Useful to tune reading-time estimates for lessons that include code, exercises, or dense
     * theoretical sections.
     */
    timeMultiplier?: number;

    /**
     * Optional repository information for the lesson.
     *
     * When provided, the layout renders repository links via `LessonRepoPanel`.
     */
    git?: RepoRef | readonly RepoRef[];
}
