import { describe, expect, it } from "vitest";
import { LessonTreeBuilder } from "../course-structure/lesson-tree-builder";

describe("LessonTreeBuilder", () => {
    it("builds links and groups with the expected lesson shape", () => {
        const lessons = new LessonTreeBuilder()
            .link("intro", "Intro", "/intro/")
            .group(
                "unit",
                "Unit",
                new LessonTreeBuilder()
                    .link("lesson-1", "Lesson 1", "/unit/lesson-1/")
                    .build(),
                "/unit/",
            )
            .build();

        expect(lessons).toEqual([
            {
                kind: "link",
                id: "intro",
                title: "Intro",
                href: "/intro/",
            },
            {
                kind: "group",
                id: "unit",
                title: "Unit",
                href: "/unit/",
                children: [
                    {
                        kind: "link",
                        id: "lesson-1",
                        title: "Lesson 1",
                        href: "/unit/lesson-1/",
                    },
                ],
            },
        ]);
    });

    it("returns a frozen top-level collection", () => {
        const lessons = new LessonTreeBuilder()
            .link("intro", "Intro", "/intro/")
            .build();

        expect(Object.isFrozen(lessons)).toBe(true);
    });
});
