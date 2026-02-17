/**
 * @file LessonSidebar.tsx
 *
 * Course navigation sidebar.
 *
 * This component renders a left-hand navigation panel that hosts the {@link LessonTree}. It is
 * intended to be used alongside the lesson content area in the main layout.
 *
 * ## Responsibilities
 *
 * - Provide a semantic landmark (`<aside>`) for course navigation.
 * - Apply the site’s sidebar styling (width, border, background + blur).
 * - Delegate the actual tree rendering and persistence to {@link LessonTree}.
 *
 * ## Design notes
 *
 * - This component is memoised via {@link memo} to avoid re-rendering when its props are stable.
 *   This is useful because the sidebar often appears on every lesson page and the tree can be
 *   relatively expensive to render.
 * - Scrolling is handled by the sidebar container (`overflow-y-auto`) to avoid nested scroll areas.
 *
 * ## Testing
 *
 * - The sidebar exposes `data-testid="lesson-sidebar-panel"` for stable integration tests.
 * - Prefer semantic queries when possible (e.g. `getByRole("complementary")` with the label), but
 *   the test id remains a convenient fallback for UI snapshots.
 */

import clsx from "clsx";
import { memo } from "react";
import type { Lesson } from "../../data/course-structure";
import { LessonTree } from "./LessonTree";

/**
 * Props for {@link LessonSidebar}.
 */
interface Props {
    /**
     * List of lessons/groups used to render the navigation tree.
     *
     * The shape of each entry is defined by {@link Lesson} and typically corresponds to the course
     * structure data used across the site.
     *
     * This prop is expected to be:
     *
     * - Stable across renders when possible (to maximize the benefit of memoization).
     * - Already normalized/validated by the caller (this component treats it as trusted input).
     */
    lessons: Lesson[];
}

/**
 * Renders the course navigation sidebar.
 *
 * @param props Component props.
 * @returns Sidebar element containing the {@link LessonTree}.
 */
function LessonSidebar({ lessons }: Props) {
    return (
        <aside
            aria-label="Navegación del curso"
            data-testid="lesson-sidebar-panel"
            className={clsx(
                "relative flex-shrink-0",
                "w-72 min-w-72",
                "px-3 py-4",
                "bg-base-background/98",
                "backdrop-blur-md",
                "border-r border-base-border/50",
                "shadow-sm",
                "overflow-y-auto overflow-x-hidden",
                "shrink-0 h-full",
            )}
        >
            <LessonTree lessons={lessons} persistKey="lesson-tree" />
        </aside>
    );
}

export default memo(LessonSidebar);
