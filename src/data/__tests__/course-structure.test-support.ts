/**
 * @file course-structure.test-support.ts
 *
 * Test utilities for the `course-structure` module.
 *
 * This file provides:
 * - Small, explicit constructors (`link`, `group`) to build valid [Lesson] values.
 * - Helpers to analyze lesson forests (e.g., `countNodes`).
 * - fast-check arbitraries that generate structurally valid lesson trees with deterministic
 *   IDs/hrefs derived from traversal paths (good shrinking + debuggability).
 *
 * ## Design goals
 *
 * - **Validity by construction:** Generated lessons respect the discriminated union invariants:
 *   - Links always have `href`.
 *   - Groups always have `children` (at least one child).
 * - **Determinism:** IDs/hrefs are derived from a stable path (`node-0-1-2`), so failing cases are
 *   easy to reproduce and understand.
 * - **Shrink-friendly:** The generator produces small trees (bounded branching + bounded depth)
 *   and titles from a restricted alphabet, reducing noisy counterexamples.
 */
import fc from "fast-check";
import type { Lesson } from "../course-structure";

/**
 * Input parameters for creating a link lesson entry.
 *
 * ## Notes:
 *
 * - `title` defaults to `id` to make fixtures concise.
 * - `children` is optional; empty or missing children are omitted from the produced object to keep
 *   the representation minimal.
 */
export type LinkInput = {
    /** Stable identifier (must be unique within a given test tree). */
    id: string;

    /** Relative URL path, expected to end with a trailing slash (e.g., `/notes/foo/`). */
    href: string;

    /** Display title; defaults to `id` for convenience in tests. */
    title?: string;

    /** Optional nested lessons under this link entry. */
    children?: readonly Lesson[];
};

/**
 * Input parameters for creating a group lesson entry.
 *
 * ## Notes:
 *
 * - Groups always require `children` to preserve the "groups are containers" invariant.
 * - `href` is optional, modelling a navigable overview page for the group.
 */
export type GroupInput = {
    /** Stable identifier (must be unique within a given test tree). */
    id: string;

    /** Child lessons. Groups must have at least one child in valid structures. */
    children: readonly Lesson[];

    /** Display title; defaults to `id` for convenience in tests. */
    title?: string;

    /** Optional overview page for the group. */
    href?: string;
};

/**
 * Constructs a `link` [Lesson] with a minimal canonical shape.
 *
 * - Omits `children` when not provided or empty.
 * - Keeps call sites readable in fixtures and generated trees.
 */
export const link = ({ id, href, title = id, children }: LinkInput): Lesson => ({
    kind: "link",
    id,
    title,
    href,
    ...(children?.length ? { children } : {}),
});

/**
 * Constructs a `group` [Lesson] with a minimal canonical shape.
 *
 * - Always includes `children` (groups are containers).
 * - Includes `href` only when provided (optional group overview page).
 */
export const group = ({ id, children, title = id, href }: GroupInput): Lesson => ({
    kind: "group",
    id,
    title,
    children,
    ...(href ? { href } : {}),
});

/**
 * Counts the total number of nodes in a lesson forest.
 *
 * This is useful for property-based tests, e.g. asserting:
 * - `flattenLessons(tree).length === countNodes(tree)`
 *
 * Implementation:
 * - Uses an explicit stack (iterative DFS) to avoid recursion depth issues.
 *
 * @param lessons Root nodes of the forest.
 * @returns Total number of lessons across all nested children.
 */
export function countNodes(lessons: readonly Lesson[]): number {
    let count = 0;
    const stack = [...lessons];

    while (stack.length > 0) {
        const lesson = stack.pop();
        if (!lesson) {
            continue;
        }

        count += 1;

        if (lesson.children?.length) {
            stack.push(...lesson.children);
        }
    }

    return count;
}

/**
 * Collects lesson IDs in pre-order traversal.
 *
 * This mirrors the ordering contract used by `flattenLessons`.
 *
 * @param lessons Root nodes of the forest.
 * @returns IDs in pre-order.
 */
export function preorderIds(lessons: readonly Lesson[]): readonly string[] {
    const result: string[] = [];

    const visit = (nodes: readonly Lesson[]): void => {
        for (const lesson of nodes) {
            result.push(lesson.id);

            if (lesson.children?.length) {
                visit(lesson.children);
            }
        }
    };

    visit(lessons);
    return result;
}

/**
 * Intermediate shape used to generate lesson trees before materializing them into [Lesson] values.
 *
 * This separation lets us:
 * - Control structural constraints (group must have children).
 * - Keep IDs/hrefs deterministic and derived from traversal paths.
 */
type LessonShape = {
    kind: "link" | "group";
    title: string;
    children: readonly LessonShape[];
    groupHasHref: boolean;
};

/**
 * Title arbitrary with a constrained alphabet.
 *
 * ## Rationale:
 *
 * - Restricting titles to visible characters avoids hard-to-debug counterexamples involving
 *   control characters or whitespace oddities.
 * - Bounded length reduces noise in shrink results.
 */
const titleArb = fc
    .array(fc.constantFrom(...`abcdefghijklmnopqrstuvwxyz0123456789 -_`), {
        minLength: 1,
        maxLength: 12,
    })
    .map((chars) => chars.join(""));

/**
 * Generates a bounded `LessonShape` tree.
 *
 * ## Constraints:
 *
 * - At max depth (`maxDepth <= 0`), only leaf `link` nodes are generated (no children).
 * - `group` nodes always have at least one child (minLength: 1).
 * - Branching is bounded (`maxLength: 3`) to keep counterexamples small.
 *
 * ## Note:
 *
 * This is defined using `fc.memo` to support recursion.
 */
const lessonShapeArb: (maxDepth: number) => fc.Arbitrary<LessonShape> = fc.memo(
    (maxDepth: number): fc.Arbitrary<LessonShape> => {
        if (maxDepth <= 0) {
            return fc.record({
                kind: fc.constant<"link">("link"),
                title: titleArb,
                children: fc.constant<readonly LessonShape[]>([]),
                groupHasHref: fc.constant(false),
            });
        }

        return fc.oneof(
            // Link node: optional children.
            fc.record({
                kind: fc.constant<"link">("link"),
                title: titleArb,
                children: fc.array(lessonShapeArb(maxDepth - 1), { maxLength: 3 }),
                groupHasHref: fc.constant(false),
            }),
            // Group node: must have children; may optionally have an overview href.
            fc.record({
                kind: fc.constant<"group">("group"),
                title: titleArb,
                children: fc.array(lessonShapeArb(maxDepth - 1), {
                    minLength: 1,
                    maxLength: 3,
                }),
                groupHasHref: fc.boolean(),
            }),
        );
    },
);

/**
 * Default arbitrary for a lesson forest with a bounded depth of 3.
 *
 * @returns An arbitrary producing a forest (array) of lessons.
 */
export const arbLessonTree = (): fc.Arbitrary<readonly Lesson[]> => arbLessonTreeWithDepth(3);

/**
 * Arbitrary that generates a forest of lessons up to the given depth.
 *
 * ## Shape:
 *
 * - Forest size is bounded (`maxLength: 4`)
 * - Each node has bounded branching (`<= 3`)
 *
 * ## Determinism:
 *
 * - IDs/hrefs are derived from the node's index path within the forest.
 *
 * @param maxDepth Maximum recursion depth for generated trees.
 * @returns An arbitrary producing a forest (array) of lessons.
 */
export const arbLessonTreeWithDepth = (maxDepth: number): fc.Arbitrary<readonly Lesson[]> =>
    fc
        .array(lessonShapeArb(maxDepth), { maxLength: 4 })
        .map(materializeTree);

/**
 * Arbitrary that generates a single lesson (root node) up to the given depth.
 *
 * The generated root uses a fixed starting path `[0]` so IDs/hrefs are deterministic.
 *
 * @param maxDepth Maximum recursion depth for the generated node.
 * @returns An arbitrary producing a single [Lesson].
 */
export const arbLessonWithDepth = (maxDepth: number): fc.Arbitrary<Lesson> =>
    lessonShapeArb(maxDepth)
        .map((shape) => materializeNode(shape, [0]));

/**
 * Default arbitrary for a single lesson with a bounded depth of 3.
 *
 * @returns An arbitrary producing a single [Lesson].
 */
export const arbLesson = (): fc.Arbitrary<Lesson> => arbLessonWithDepth(3);

/**
 * Materializes a [Lesson] from a [LessonShape], assigning deterministic IDs/hrefs.
 *
 * ID/href scheme:
 * - `id = node-${path.join("-")}`
 * - `href = /${id}/`
 *
 * This makes counterexamples readable (the ID encodes the node's position), while also
 * guaranteeing uniqueness within the generated structure.
 *
 * @param shape Shape node to materialize.
 * @param path  Index path from the forest root to this node.
 * @returns A concrete [Lesson] satisfying the module invariants.
 */
function materializeNode(shape: LessonShape, path: readonly number[]): Lesson {
    const suffix = path.join("-");
    const id = `node-${suffix}`;
    const href = `/${id}/`;

    const children = shape.children.map((child, index) => materializeNode(child, [...path, index]));

    if (shape.kind === "link") {
        // Links always have href. Children are optional.
        return link({ id, title: shape.title, href, children });
    }

    // Groups always have children; href is optional.
    return group({
        id,
        title: shape.title,
        children,
        ...(shape.groupHasHref ? { href } : {}),
    });
}

/**
 * Materializes a forest (array) of [Lesson] values from [LessonShape] roots.
 *
 * Root paths start at `[index]`, ensuring stable uniqueness across siblings.
 */
const materializeTree = (shapes: readonly LessonShape[]): readonly Lesson[] =>
    shapes.map((shape, index) => materializeNode(shape, [index]));
