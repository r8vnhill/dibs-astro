import { courseStructure as internalCourseStructure } from "./course-structure/index";

/**
 * Base properties shared by all lesson entries.
 *
 * This type encodes metadata that must remain stable across:
 * - UI rendering (React keys)
 * - localStorage persistence (expanded state, progress)
 * - analytics instrumentation
 *
 * Invariants:
 * - `id` MUST be globally unique across the entire course structure.
 * - `id` MUST remain stable even if `title` or `href` changes.
 */
type LessonBase = {
    /**
     * Stable identifier for the lesson.
     *
     * This value is used as:
     * - React key
     * - Persistence key (e.g., expanded/collapsed state)
     * - Analytics identifier
     *
     * It must never be derived from `title` or `href`.
     */
    id: string;

    /**
     * Human-readable title displayed in navigation.
     *
     * Titles may change over time and are not suitable as identifiers.
     */
    title: string;
};

/**
 * A navigable lesson entry that represents a concrete page.
 *
 * A link lesson:
 * - Always has a `href`
 * - May optionally have children (e.g., "page with subpages")
 *
 * This models real pages in the site structure.
 */
type LinkLesson = LessonBase & {
    kind: "link";

    /**
     * URL path to the lesson page.
     *
     * ## Rules:
     *
     * - Must be relative (e.g., "/notes/foo/")
     * - Must end with a trailing slash for normalization consistency
     * - Must be globally unique across the structure
     */
    href: string;

    /**
     * Optional nested lessons under this link entry.
     *
     * This allows modeling pages that also act as containers.
     */
    children?: readonly Lesson[];
};

/**
 * A structural grouping that organizes lessons hierarchically.
 *
 * A group:
 * - Must always have children
 * - May optionally have an overview/index page (`href`)
 *
 * Groups primarily exist for navigation structure and conceptual grouping.
 */
type GroupLesson = LessonBase & {
    kind: "group";

    /**
     * Optional overview page for the group.
     *
     * If provided, the group itself becomes navigable.
     */
    href?: string;

    /**
     * Child lessons.
     *
     * Invariant:
     * - Groups MUST have at least one child.
     */
    children: readonly Lesson[];
};

/**
 * Discriminated union representing a lesson entry.
 *
 * Using `kind` enforces compile-time correctness and prevents:
 * - Empty/misused entries
 * - Accidental omission of required fields
 * - Structural ambiguity in UI rendering
 */
export type Lesson = LinkLesson | GroupLesson;

/**
 * A lesson entry augmented with metadata from hierarchical flattening.
 *
 * ## Additional metadata enables:
 *
 * - Linear navigation (next/previous)
 * - Breadcrumb rendering
 * - Indentation in tree UI
 * - Analytics context
 */
export type FlattenedLesson = Lesson & {
    /**
     * Nesting depth (root = 0)
     */
    depth: number;
    /**
     * Titles of ancestor lessons (for breadcrumb display)
     */
    parents: readonly string[];
    /**
     * IDs of ancestor lessons (for state management and analytics)
     */
    parentIds: readonly string[];
};

/**
 * Defines the hierarchical structure of the course.
 *
 * ## This structure is the single source of truth for:
 *
 * - Sidebar rendering
 * - Automatic navigation (next/previous)
 * - Progress tracking
 * - Structural validation
 *
 * ## Built using `satisfies readonly Lesson[]` to:
 *
 * - Preserve literal types
 * - Enforce schema validation
 * - Prevent accidental widening
 *
 * ## Architectural Note:
 *
 * The structure is intentionally declarative and static to allow:
 * - Compile-time validation
 * - Tree-shaking
 * - Deterministic navigation ordering
 */
export const courseStructure: readonly Lesson[] = internalCourseStructure;

/**
 * Generator that walks the lesson tree using pre-order traversal.
 *
 * ## Pre-order guarantees:
 *
 * - A parent is yielded before its children.
 * - The resulting order matches expected navigation flow.
 *
 * ## Design:
 *
 * - Uses recursion via `yield*` for clarity.
 * - Produces immutable ancestry metadata snapshots.
 * - Safe for typical navigation depth (course trees are shallow).
 *
 * ## This generator enables:
 *
 * - Streaming traversal (if needed in future)
 * - Reusable traversal logic independent of flattening
 *
 * @param lessons   Root lessons to traverse
 * @param depth     Current depth (root = 0)
 * @param parents   Accumulated ancestor titles
 * @param parentIds Accumulated ancestor IDs
 */
export function* walkLessons(
    lessons: readonly Lesson[],
    depth = 0,
    parents: readonly string[] = [],
    parentIds: readonly string[] = [],
): Generator<FlattenedLesson> {
    for (const lesson of lessons) {
        yield {
            ...lesson,
            depth,
            parents: Object.freeze([...parents]),
            parentIds: Object.freeze([...parentIds]),
        };

        if (lesson.children?.length) {
            yield* walkLessons(
                lesson.children,
                depth + 1,
                [...parents, lesson.title],
                [...parentIds, lesson.id],
            );
        }
    }
}

/**
 * Converts a hierarchical lesson structure into a flat, immutable list.
 *
 * ## Guarantees:
 *
 * - Pre-order traversal
 * - Stable deterministic ordering
 * - Immutable result (frozen)
 *
 * ## Why freeze?
 *
 * - Prevents accidental mutation
 * - Preserves referential integrity
 * - Encourages functional usage patterns
 *
 * This function is pure and has no side effects.
 *
 * @param lessons Root lesson list
 * @returns Frozen flat array of `FlattenedLesson`
 */
export function flattenLessons(
    lessons: readonly Lesson[],
): readonly FlattenedLesson[] {
    return Object.freeze(Array.from(walkLessons(lessons)));
}

/**
 * Runtime validator for course structure integrity.
 *
 * ## Purpose:
 *
 * Fail fast during development when structural invariants are violated.
 *
 * ## Validations performed:
 *
 * - Duplicate IDs (breaks React keys and persistence)
 * - Duplicate hrefs (breaks navigation and SEO)
 * - Missing trailing slashes (normalization invariant)
 * - Empty groups (schema misuse)
 *
 * ## Design Principles:
 *
 * - Throws immediately on first violation
 * - Intended for development/test environments only
 * - Safe to tree-shake in production builds
 *
 * This complements (but does not replace) TypeScript's compile-time guarantees.
 */
export function validateCourseStructure(
    lessons: readonly Lesson[],
): void {
    const seenIds = new Set<string>();
    const seenHrefs = new Set<string>();

    function normalizeHref(href: string): string {
        let normalizedHref = href.startsWith("/") ? href : `/${href}`;

        if (normalizedHref.length > 1 && !normalizedHref.endsWith("/")) {
            normalizedHref += "/";
        }

        return normalizedHref;
    }

    function validate(lesson: Lesson, path: string, parentHref?: string): void {
        if (seenIds.has(lesson.id)) {
            throw new Error(
                `Duplicate lesson ID "${lesson.id}" at ${path}. IDs must be unique.`,
            );
        }
        seenIds.add(lesson.id);

        if (lesson.href) {
            const normalizedHref = normalizeHref(lesson.href);

            if (!lesson.href.endsWith("/")) {
                throw new Error(
                    `Lesson "${lesson.id}" href "${lesson.href}" must end with trailing slash.`,
                );
            }
            if (seenHrefs.has(normalizedHref)) {
                throw new Error(
                    `Duplicate href "${lesson.href}" at ${path}. Each href must be unique.`,
                );
            }
            seenHrefs.add(normalizedHref);

            if (
                parentHref &&
                normalizedHref !== parentHref &&
                !normalizedHref.startsWith(parentHref)
            ) {
                throw new Error(
                    `Lesson "${lesson.id}" href "${lesson.href}" must be nested under parent href "${parentHref}".`,
                );
            }
        }

        if (lesson.kind === "group" && !lesson.children?.length) {
            throw new Error(
                `Group lesson "${lesson.id}" has no children.`,
            );
        }

        if (lesson.children?.length) {
            const lessonHref = lesson.href ? normalizeHref(lesson.href) : parentHref;

            for (const child of lesson.children) {
                validate(child, `${path} > ${lesson.id}`, lessonHref);
            }
        }
    }

    for (const lesson of lessons) {
        validate(lesson, "root");
    }
}

/**
 * Automatically validate structure in non-production environments.
 *
 * **This ensures:**
 * - Development failures are immediate and visible
 * - Production builds remain free of validation overhead
 */
if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    validateCourseStructure(courseStructure);
}
