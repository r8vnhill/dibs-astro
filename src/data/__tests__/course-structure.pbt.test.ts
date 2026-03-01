import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { flattenLessons } from "../course-structure";
import { arbLessonTree, countNodes } from "./course-structure.test-support";

describe("course-structure flattening (PBT)", () => {
    it("satisfies flattening invariants for random valid trees", () => {
        fc.assert(
            fc.property(arbLessonTree(), (tree) => {
                const flattened = flattenLessons(tree);

                expect(flattened.length).toBe(countNodes(tree));

                if (flattened.length > 0) {
                    expect(flattened[0]?.depth).toBe(0);
                }

                const indexById = new Map(
                    flattened.map((node, index) => [node.id, index] as const),
                );
                const titleById = new Map(flattened.map((node) => [node.id, node.title]));

                flattened.forEach((node, nodeIndex) => {
                    expect(node.parents.length).toBe(node.depth);
                    expect(node.parentIds.length).toBe(node.depth);
                    expect(node.parents.length).toBe(node.parentIds.length);

                    const reconstructedParents = node.parentIds.map((id) => titleById.get(id));
                    expect(reconstructedParents).toEqual(node.parents);

                    node.parentIds.forEach((ancestorId, pathIndex) => {
                        const ancestorIndex = indexById.get(ancestorId);
                        expect(ancestorIndex).toBeDefined();
                        expect(ancestorIndex).toBeLessThan(nodeIndex);

                        const expectedTitle = titleById.get(ancestorId);
                        expect(node.parents[pathIndex]).toBe(expectedTitle);
                    });
                });
            }),
            { numRuns: 200 },
        );
    });
});
