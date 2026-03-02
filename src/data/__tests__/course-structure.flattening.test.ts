import { describe, expect, it } from "vitest";
import { flattenLessons, type Lesson } from "../course-structure";
import { group, link } from "./course-structure.test-support";

describe("course-structure flattening (DDT)", () => {
    const traversalCases: readonly {
        name: string;
        tree: readonly Lesson[];
        expectedIds: readonly string[];
    }[] = [
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
    ];

    it.each(traversalCases)("preserves traversal order for $name", ({ tree, expectedIds }) => {
        const flattened = flattenLessons(tree);
        expect(flattened.map((node) => node.id)).toEqual(expectedIds);
    });

    const ancestryCases: readonly {
        name: string;
        tree: readonly Lesson[];
        checks: readonly {
            id: string;
            depth: number;
            parents: readonly string[];
            parentIds: readonly string[];
        }[];
    }[] = [
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
    ];

    it.each(ancestryCases)("preserves ancestry metadata for $name", ({ tree, checks }) => {
        const flattened = flattenLessons(tree);

        for (const check of checks) {
            const node = flattened.find((entry) => entry.id === check.id);
            expect(node).toBeDefined();
            expect(node?.depth).toBe(check.depth);
            expect(node?.parents).toEqual(check.parents);
            expect(node?.parentIds).toEqual(check.parentIds);
        }
    });

    const edgeCases: readonly {
        name: string;
        tree: readonly Lesson[];
        assert: (flattened: ReturnType<typeof flattenLessons>) => void;
    }[] = [
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
            assert: (flattened) => {
                expect(flattened).toHaveLength(2);
                expect(flattened[0]?.kind).toBe("group");
                expect(flattened[0]?.href).toBe("/unit/");
                expect(flattened[1]?.kind).toBe("link");
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
            assert: (flattened) => {
                expect(flattened).toHaveLength(2);
                expect(flattened[0]?.kind).toBe("link");
                expect(flattened[0]?.children?.[0]?.id).toBe("subpage");
                expect(flattened[1]?.parents).toEqual(["Page with Subpages"]);
            },
        },
    ];

    it.each(edgeCases)("supports edge case: $name", ({ tree, assert }) => {
        assert(flattenLessons(tree));
    });

    it("returns an empty frozen array for empty input", () => {
        const flattened = flattenLessons([]);
        expect(flattened).toEqual([]);
        expect(Object.isFrozen(flattened)).toBe(true);
    });

    it("returns a frozen top-level array", () => {
        const flattened = flattenLessons([
            link({ id: "link1", title: "Link", href: "/link/" }),
        ]);

        expect(Object.isFrozen(flattened)).toBe(true);
        expect(Object.isFrozen(flattened[0] ?? {})).toBe(false);
    });

    it("keeps nested ancestry arrays immutable by value", () => {
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

        const mutatedParents = [...(child?.parents ?? []), "noise"];
        expect(child?.parents).not.toEqual(mutatedParents);
    });
});
