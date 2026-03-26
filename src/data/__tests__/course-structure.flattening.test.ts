/**
 * Regression tests for {@link flattenLessons}.
 *
 * This suite documents the example-driven contract of lesson flattening through small, readable
 * scenarios. Its goal is to make failures easy to diagnose when a change breaks traversal order,
 * ancestry derivation, supported input shapes, or immutability guarantees.
 *
 * ## What this suite covers
 *
 * - pre-order traversal across nested and multi-root lesson trees
 * - ancestry metadata (`depth`, `parents`, `parentIds`) derived from the path
 * - supported structural shapes such as groups with overview pages and links that also own children
 * - immutability guarantees for the returned top-level array and ancestry snapshots stored on
 *   flattened nodes
 *
 * ## What this suite does not cover
 *
 * Exhaustive structural invariants are validated separately in `course-structure.pbt.test.ts`.
 * This file stays intentionally example-driven so each case can communicate a concrete rule of the
 * public behavior.
 */
import { describe, expect, it } from "vitest";
import {
    flattenLessons,
    type FlattenedLesson,
    type Lesson,
} from "../course-structure";
import { group, link } from "./course-structure.test-support";

/**
 * Builds a lookup map for a flattened fixture.
 *
 * Ancestry assertions often need to target a node by `id`. Indexing once keeps the tests focused
 * on the expected behavior rather than repeated linear searches.
 */
const indexById = <T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> =>
    new Map(items.map((item) => [item.id, item] as const));

/**
 * Minimal ancestry metadata asserted by this suite.
 *
 * The tests intentionally narrow assertions to the fields that express path derivation:
 *
 * - `depth` counts how many ancestors a node has
 * - `parents` stores ancestor titles in root-to-parent order
 * - `parentIds` stores ancestor identifiers in the same order
 */
type NodeMeta = Pick<FlattenedLesson, "depth" | "parents" | "parentIds">;

/**
 * Asserts the ancestry metadata derived for a single flattened node.
 *
 * The helper keeps ancestry-oriented tests concise and makes failures point to the semantic
 * contract being checked instead of to repeated assertion boilerplate.
 */
function expectNodeMeta(
    node: NodeMeta | undefined,
    expected: NodeMeta,
): void {
    expect(node).toBeDefined();
    expect(node?.depth).toBe(expected.depth);
    expect(node?.parents).toEqual(expected.parents);
    expect(node?.parentIds).toEqual(expected.parentIds);
}

describe("course-structure flattening (DDT)", () => {
    describe("traversal", () => {
        /**
         * Representative trees used to lock down traversal order.
         *
         * All expected sequences follow the public contract that {@link flattenLessons} performs a
         * pre-order walk:
         *
         * 1. emit the current node
         * 2. recursively emit its descendants from left to right
         */
        const traversalCases = [
            {
                name: "single link node",
                tree: [link({ id: "single", title: "Single Link", href: "/single/" })],
                expectedIds: ["single"],
            },
            {
                name: "wide siblings in pre-order",
                tree: [
                    group({
                        id: "parent",
                        title: "Parent",
                        children: [
                            link({ id: "child1", title: "Child 1", href: "/child1/" }),
                            link({ id: "child2", title: "Child 2", href: "/child2/" }),
                            link({ id: "child3", title: "Child 3", href: "/child3/" }),
                        ],
                    }),
                ],
                expectedIds: ["parent", "child1", "child2", "child3"],
            },
            {
                name: "complex pre-order traversal",
                tree: [
                    group({
                        id: "unit",
                        title: "Unit",
                        children: [
                            link({ id: "lesson1", title: "Lesson 1", href: "/lesson1/" }),
                            group({
                                id: "subunit",
                                title: "Subunit",
                                children: [
                                    link({
                                        id: "sublesson1",
                                        title: "Sublesson 1",
                                        href: "/sublesson1/",
                                    }),
                                    link({
                                        id: "sublesson2",
                                        title: "Sublesson 2",
                                        href: "/sublesson2/",
                                    }),
                                ],
                            }),
                            link({ id: "lesson2", title: "Lesson 2", href: "/lesson2/" }),
                        ],
                    }),
                ],
                expectedIds: [
                    "unit",
                    "lesson1",
                    "subunit",
                    "sublesson1",
                    "sublesson2",
                    "lesson2",
                ],
            },
            {
                name: "multiple roots preserve global pre-order",
                tree: [
                    link({ id: "a", title: "A", href: "/a/" }),
                    group({
                        id: "b",
                        title: "B",
                        children: [link({ id: "c", title: "C", href: "/c/" })],
                    }),
                    link({ id: "d", title: "D", href: "/d/" }),
                ],
                expectedIds: ["a", "b", "c", "d"],
            },
        ] as const satisfies readonly {
            name: string;
            tree: readonly Lesson[];
            expectedIds: readonly string[];
        }[];

        it.each(traversalCases)("preserves traversal order for $name", ({ tree, expectedIds }) => {
            const flattened = flattenLessons(tree);
            expect(flattened.map((node) => node.id)).toEqual(expectedIds);
        });

        it("captures representative flattened metadata for a mixed nested tree", () => {
            const flattened = flattenLessons([
                group({
                    id: "unit",
                    title: "Unit",
                    children: [
                        link({ id: "lesson1", title: "Lesson 1", href: "/lesson1/" }),
                        group({
                            id: "subunit",
                            title: "Subunit",
                            children: [link({ id: "lesson2", title: "Lesson 2", href: "/lesson2/" })],
                        }),
                    ],
                }),
            ]);

            expect(flattened).toMatchObject([
                { id: "unit", depth: 0, parentIds: [], parents: [] },
                { id: "lesson1", depth: 1, parentIds: ["unit"], parents: ["Unit"] },
                { id: "subunit", depth: 1, parentIds: ["unit"], parents: ["Unit"] },
                {
                    id: "lesson2",
                    depth: 2,
                    parentIds: ["unit", "subunit"],
                    parents: ["Unit", "Subunit"],
                },
            ]);
        });
    });

    describe("ancestry", () => {
        /**
         * Cases that isolate ancestry derivation independently from traversal.
         *
         * These fixtures check both the numeric depth and the textual/id-based ancestor chains.
         * Repeated titles are included to ensure the tests do not accidentally treat titles as
         * stable identity.
         */
        const ancestryCases = [
            {
                name: "deep chain",
                tree: [
                    link({
                        id: "a",
                        title: "A",
                        href: "/a/",
                        children: [
                            link({
                                id: "b",
                                title: "B",
                                href: "/b/",
                                children: [link({ id: "c", title: "C", href: "/c/" })],
                            }),
                        ],
                    }),
                ],
                checks: [
                    { id: "a", depth: 0, parents: [], parentIds: [] },
                    { id: "b", depth: 1, parents: ["A"], parentIds: ["a"] },
                    { id: "c", depth: 2, parents: ["A", "B"], parentIds: ["a", "b"] },
                ],
            },
            {
                name: "wide siblings have same depth",
                tree: [
                    group({
                        id: "parent",
                        title: "Parent",
                        children: [
                            link({ id: "child1", href: "/child1/" }),
                            link({ id: "child2", href: "/child2/" }),
                            link({ id: "child3", href: "/child3/" }),
                        ],
                    }),
                ],
                checks: [
                    { id: "parent", depth: 0, parents: [], parentIds: [] },
                    { id: "child1", depth: 1, parents: ["Parent"], parentIds: ["parent"] },
                    { id: "child2", depth: 1, parents: ["Parent"], parentIds: ["parent"] },
                    { id: "child3", depth: 1, parents: ["Parent"], parentIds: ["parent"] },
                ],
            },
            {
                name: "repeated titles preserve distinct parent ids",
                tree: [
                    group({
                        id: "root",
                        title: "Repeated",
                        children: [
                            group({
                                id: "inner",
                                title: "Repeated",
                                children: [link({ id: "leaf", title: "Leaf", href: "/leaf/" })],
                            }),
                        ],
                    }),
                ],
                checks: [
                    { id: "root", depth: 0, parents: [], parentIds: [] },
                    { id: "inner", depth: 1, parents: ["Repeated"], parentIds: ["root"] },
                    {
                        id: "leaf",
                        depth: 2,
                        parents: ["Repeated", "Repeated"],
                        parentIds: ["root", "inner"],
                    },
                ],
            },
        ] as const satisfies readonly {
            name: string;
            tree: readonly Lesson[];
            checks: readonly ({ id: string } & NodeMeta)[];
        }[];

        it.each(ancestryCases)("preserves ancestry metadata for $name", ({ tree, checks }) => {
            const flattened = flattenLessons(tree);
            const nodesById = indexById(flattened);

            for (const check of checks) {
                expectNodeMeta(nodesById.get(check.id), check);
            }
        });
    });

    describe("edge shapes", () => {
        /**
         * Edge fixtures documenting supported input shapes.
         *
         * These are not necessarily the most common structures, but they are
         * accepted by the public model and therefore need regression coverage.
         */
        const edgeCases = [
            {
                name: "group with overview href",
                tree: [
                    group({
                        id: "group-with-overview",
                        title: "Unit",
                        href: "/unit/",
                        children: [
                            link({ id: "lesson1", title: "Lesson 1", href: "/unit/lesson1/" }),
                        ],
                    }),
                ],
                assert: (flattened: ReturnType<typeof flattenLessons>) => {
                    expect(flattened).toHaveLength(2);
                    expect(flattened[0]?.kind).toBe("group");
                    expect(flattened[0]?.href).toBe("/unit/");
                    expect(flattened[1]?.kind).toBe("link");
                },
            },
            {
                name: "group with overview href and multiple descendants",
                tree: [
                    group({
                        id: "group-overview",
                        title: "Overview",
                        href: "/overview/",
                        children: [
                            link({ id: "lesson1", title: "Lesson 1", href: "/overview/lesson1/" }),
                            group({
                                id: "nested",
                                title: "Nested",
                                children: [
                                    link({
                                        id: "lesson2",
                                        title: "Lesson 2",
                                        href: "/overview/nested/lesson2/",
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
                assert: (flattened: ReturnType<typeof flattenLessons>) => {
                    expect(flattened.map((node) => node.id)).toEqual([
                        "group-overview",
                        "lesson1",
                        "nested",
                        "lesson2",
                    ]);
                    expect(flattened[0]?.href).toBe("/overview/");
                    expect(flattened[3]?.parents).toEqual(["Overview", "Nested"]);
                },
            },
            {
                name: "link with children",
                tree: [
                    link({
                        id: "page",
                        title: "Page with Subpages",
                        href: "/page/",
                        children: [
                            link({
                                id: "subpage",
                                title: "Subpage",
                                href: "/page/subpage/",
                            }),
                        ],
                    }),
                ],
                assert: (flattened: ReturnType<typeof flattenLessons>) => {
                    expect(flattened).toHaveLength(2);
                    expect(flattened[0]?.kind).toBe("link");
                    expect(flattened[0]?.children?.[0]?.id).toBe("subpage");
                    expect(flattened[1]?.parents).toEqual(["Page with Subpages"]);
                },
            },
            {
                name: "link with empty children array omits nested traversal",
                tree: [
                    {
                        kind: "link" as const,
                        id: "lonely",
                        title: "Lonely",
                        href: "/lonely/",
                        children: [],
                    },
                ],
                assert: (flattened: ReturnType<typeof flattenLessons>) => {
                    expect(flattened).toHaveLength(1);
                    expect(flattened[0]?.id).toBe("lonely");
                    expect(flattened[0]?.children).toEqual([]);
                },
            },
            {
                name: "multiple root branches preserve sibling order",
                tree: [
                    group({
                        id: "root-a",
                        title: "Root A",
                        children: [link({ id: "child-a", href: "/child-a/" })],
                    }),
                    link({ id: "root-b", title: "Root B", href: "/root-b/" }),
                    group({
                        id: "root-c",
                        title: "Root C",
                        children: [link({ id: "child-c", href: "/child-c/" })],
                    }),
                ],
                assert: (flattened: ReturnType<typeof flattenLessons>) => {
                    expect(flattened.map((node) => node.id)).toEqual([
                        "root-a",
                        "child-a",
                        "root-b",
                        "root-c",
                        "child-c",
                    ]);
                },
            },
        ] as const satisfies readonly {
            name: string;
            tree: readonly Lesson[];
            assert: (flattened: ReturnType<typeof flattenLessons>) => void;
        }[];

        it.each(edgeCases)("supports edge case: $name", ({ tree, assert }) => {
            assert(flattenLessons(tree));
        });
    });

    describe("immutability", () => {
        it("returns an empty frozen array for empty input", () => {
            const flattened = flattenLessons([]);
            expect(flattened).toEqual([]);
            expect(Object.isFrozen(flattened)).toBe(true);
        });

        it("returns a frozen top-level array without freezing lesson objects", () => {
            const flattened = flattenLessons([
                link({ id: "link1", title: "Link", href: "/link/" }),
            ]);

            expect(Object.isFrozen(flattened)).toBe(true);
            expect(Object.isFrozen(flattened[0] ?? {})).toBe(false);
        });

        it("returns frozen ancestry arrays for nested nodes", () => {
            const flattened = flattenLessons([
                link({
                    id: "root",
                    href: "/root/",
                    children: [link({ id: "child", href: "/child/" })],
                }),
            ]);

            const child = flattened[1];
            expect(child?.parents).toEqual(["root"]);
            expect(child?.parentIds).toEqual(["root"]);
            expect(Object.isFrozen(child?.parents ?? [])).toBe(true);
            expect(Object.isFrozen(child?.parentIds ?? [])).toBe(true);
        });

        it("returns independent ancestry arrays for derived copies", () => {
            const flattened = flattenLessons([
                link({
                    id: "root",
                    href: "/root/",
                    children: [link({ id: "child", href: "/child/" })],
                }),
            ]);

            const child = flattened[1];
            const mutatedParents = [...(child?.parents ?? []), "noise"];

            expect(child?.parents).toEqual(["root"]);
            expect(child?.parents).not.toEqual(mutatedParents);
        });
    });
});
