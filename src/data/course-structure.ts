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
export const courseStructure = [
    {
        kind: "link",
        id: "how-to-start",
        title: "¿Cómo usar este apunte?",
        href: "/notes/",
    },
    {
        kind: "link",
        id: "installation",
        title: "Herramientas necesarias y recomendadas",
        href: "/notes/installation/",
    },
    {
        kind: "group",
        id: "unit-1",
        title: "Unidad 1 - Introducción al desarrollo de bibliotecas de software",
        href: "/notes/software-libraries/",
        children: [
            {
                kind: "link",
                id: "lib-what-is",
                title: "Bibliotecas de software",
                href: "/notes/software-libraries/what-is/",
            },
            {
                kind: "link",
                id: "task-automation",
                title: "Automatización de tareas",
                href: "/notes/software-libraries/task-automation/",
            },
            {
                kind: "group",
                id: "scripting",
                title: "Scripting",
                href: "/notes/software-libraries/scripting/",
                children: [
                    {
                        kind: "link",
                        id: "scripting-help",
                        title: "Ayuda",
                        href: "/notes/software-libraries/scripting/help/",
                    },
                    {
                        kind: "link",
                        id: "first-script",
                        title: "Primer script",
                        href: "/notes/software-libraries/scripting/first-script/",
                    },
                    {
                        kind: "link",
                        id: "structured-output",
                        title: "Salida estructurada",
                        href: "/notes/software-libraries/scripting/structured-output/",
                    },
                    {
                        kind: "link",
                        id: "should-process",
                        title: "Ensayo seguro (-WhatIf/-Confirm)",
                        href: "/notes/software-libraries/scripting/should-process/",
                    },
                    {
                        kind: "link",
                        id: "scripting-errors",
                        title: "Manejo de errores",
                        href: "/notes/software-libraries/scripting/errors/",
                    },
                    {
                        kind: "link",
                        id: "lab-gitlab",
                        title: "Lab. 1: GitLab",
                        href: "/notes/software-libraries/scripting/gitlab/",
                    },
                    {
                        kind: "group",
                        id: "pipelines",
                        title: "Pipelines",
                        href: "/notes/software-libraries/scripting/pipelines/",
                        children: [
                            {
                                kind: "link",
                                id: "pipeline-aware",
                                title: "Pipeline-awareness",
                                href: "/notes/software-libraries/scripting/pipelines/pipeline-aware/",
                            },
                            {
                                kind: "link",
                                id: "pipeline-errors",
                                title: "Manejo de errores",
                                href: "/notes/software-libraries/scripting/pipelines/errors/",
                            },
                            {
                                kind: "link",
                                id: "git-submodules",
                                title: "Lab. 2: Git Submodules",
                                href: "/notes/software-libraries/scripting/pipelines/git-submodules/",
                            }
                        ],
                    },
                ],
            },
            {
                kind: "group",
                id: "build-systems",
                title: "Sistemas de construcción",
                href: "/notes/software-libraries/build-systems/",
                children: [
                    {
                        kind: "link",
                        id: "veritas-1",
                        title: "Veritas: Ep. 1",
                        href: "/notes/software-libraries/build-systems/veritas-1/",
                    },
                ],
            },
            {
                kind: "link",
                id: "business-vs-app",
                title: "Lógica de negocio y aplicación",
                href: "/notes/software-libraries/business-vs-app/",
            },
            {
                kind: "link",
                id: "domain-models",
                title: "Modelos de dominio",
                href: "/notes/software-libraries/domain-models/",
            },
        ],
    },
    {
        kind: "group",
        id: "unit-2",
        title: "Unidad 2 - Fundamentos de tipos y representaciones de datos",
        href: "/notes/type-fundamentals/",
        children: [
            {
                kind: "group",
                id: "kotlin-basics",
                title: "Kotlin",
                href: "/notes/type-fundamentals/basics/",
                children: [
                    {
                        kind: "link",
                        id: "kotlin-functions",
                        title: "Funciones",
                        href: "/notes/type-fundamentals/basics/functions/",
                    },
                    {
                        kind: "link",
                        id: "kotlin-variables",
                        title: "Variables",
                        href: "/notes/type-fundamentals/basics/variables/",
                    },
                ],
            },
        ],
    },
] as const satisfies readonly Lesson[];

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

    function validate(lesson: Lesson, path: string): void {
        if (seenIds.has(lesson.id)) {
            throw new Error(
                `Duplicate lesson ID "${lesson.id}" at ${path}. IDs must be unique.`,
            );
        }
        seenIds.add(lesson.id);

        if (lesson.href) {
            if (!lesson.href.endsWith("/")) {
                throw new Error(
                    `Lesson "${lesson.id}" href "${lesson.href}" must end with trailing slash.`,
                );
            }
            if (seenHrefs.has(lesson.href)) {
                throw new Error(
                    `Duplicate href "${lesson.href}" at ${path}. Each href must be unique.`,
                );
            }
            seenHrefs.add(lesson.href);
        }

        if (lesson.kind === "group" && !lesson.children?.length) {
            throw new Error(
                `Group lesson "${lesson.id}" has no children.`,
            );
        }

        if (lesson.children?.length) {
            for (const child of lesson.children) {
                validate(child, `${path} > ${lesson.id}`);
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
