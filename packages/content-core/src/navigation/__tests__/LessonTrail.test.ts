/**
 * Tests for LessonTrail entity.
 *
 * Validates immutability, trail building, and properties.
 */

import { LessonTrail } from "../lesson-trail";
import type { TrailNode } from "../types";
import { describe, expect, it } from "vitest";

describe("LessonTrail entity", () => {
    it("should be immutable (Object.frozen)", () => {
        const nodes: readonly TrailNode[] = [
            { title: "Unit 1", href: "/notes/unit-1/" },
            { title: "Lesson A", href: "/notes/unit-1/lesson-a/" },
        ];

        const trail = LessonTrail.create(nodes);

        expect(Object.isFrozen(trail)).toBe(true);
        expect(Object.isFrozen(trail.nodes)).toBe(true);
    });

    it("buildFromAncestry() skips missing ancestors", () => {
        const idToNode = new Map<string, TrailNode>([
            ["unit-1", { title: "Unit 1", href: "/notes/unit-1/" }],
            // "missing-ancestor" is intentionally missing
        ]);

        const current: TrailNode = { title: "Lesson A", href: "/notes/unit-1/lesson-a/" };

        const trail = LessonTrail.buildFromAncestry(
            ["unit-1", "missing-ancestor"],
            idToNode,
            current,
        );

        // Trail should include only unit-1 and current, skipping missing-ancestor
        expect(trail.nodes).toContainEqual({ title: "Unit 1", href: "/notes/unit-1/" });
        expect(trail.nodes).toContainEqual(current);
    });

    it("isEmpty() returns true only if no nodes", () => {
        const emptyTrail = LessonTrail.create([]);
        const nonEmptyTrail = LessonTrail.create([{ title: "Lesson", href: "/notes/" }]);

        expect(emptyTrail.isEmpty()).toBe(true);
        expect(nonEmptyTrail.isEmpty()).toBe(false);
    });

    it("navigableCount counts only nodes with href", () => {
        const nodes: readonly TrailNode[] = [
            { title: "Unit 1", href: "/notes/unit-1/" }, // 1 navigable
            { title: "Section A" }, // not navigable (no href)
            { title: "Lesson B", href: "/notes/unit-1/section-a/lesson-b/" }, // 1 navigable
        ];

        const trail = LessonTrail.create(nodes);

        expect(trail.navigableCount).toBe(2);
    });
});
