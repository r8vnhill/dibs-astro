import { describe, expect, it } from "vitest";
import {
    courseStructure,
    flattenLessons,
    type Lesson,
    validateCourseStructure,
} from "../course-structure";
import { group, link } from "./course-structure.test-support";

describe("course-structure validation", () => {
    it("passes validation for courseStructure", () => {
        expect(() => {
            validateCourseStructure(courseStructure);
        }).not.toThrow();
    });

    it("keeps traversal order stable for courseStructure", () => {
        const flattened = flattenLessons(courseStructure);
        expect(flattened[0]?.id).toBe("how-to-start");
        expect(flattened[flattened.length - 1]?.id).toBe("kotlin-variables");
    });

    it("rejects duplicate IDs", () => {
        const invalid: readonly Lesson[] = [
            link({ id: "dup", title: "First", href: "/first/" }),
            link({ id: "dup", title: "Second", href: "/second/" }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/Duplicate lesson ID "dup"/);
    });

    it("rejects duplicate IDs across mixed kinds", () => {
        const invalid: readonly Lesson[] = [
            group({ id: "dup", title: "Group", children: [link({ id: "x", href: "/x/" })] }),
            link({ id: "dup", title: "Link", href: "/dup-link/" }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/Duplicate lesson ID "dup"/);
    });

    it("rejects duplicate hrefs", () => {
        const invalid: readonly Lesson[] = [
            link({ id: "a", title: "First", href: "/same/" }),
            link({ id: "b", title: "Second", href: "/same/" }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/Duplicate href "\/same\/"/);
    });

    it("rejects duplicate href across group overview and link", () => {
        const invalid: readonly Lesson[] = [
            group({
                id: "unit",
                title: "Unit",
                href: "/unit/",
                children: [link({ id: "lesson", title: "Lesson", href: "/unit/" })],
            }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/Duplicate href "\/unit\/"/);
    });

    it("rejects hrefs without trailing slashes", () => {
        const invalid: readonly Lesson[] = [
            link({ id: "no-slash", title: "No Slash", href: "/no-slash" }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/must end with trailing slash/);
    });

    it("rejects empty groups", () => {
        const invalid: readonly Lesson[] = [
            group({ id: "empty", title: "Empty", children: [] }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/Group lesson "empty" has no children/);
    });

    it("rejects group with href but no children", () => {
        const invalid: readonly Lesson[] = [
            group({ id: "empty-overview", title: "Empty", href: "/empty/", children: [] }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/Group lesson "empty-overview" has no children/);
    });

    it("detects nested violations", () => {
        const invalid: readonly Lesson[] = [
            group({
                id: "parent",
                title: "Parent",
                children: [
                    link({ id: "dup", title: "First Child", href: "/first/" }),
                    link({ id: "dup", title: "Second Child", href: "/second/" }),
                ],
            }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/Duplicate lesson ID "dup"/);
    });

    it("rejects link child with missing trailing slash", () => {
        const invalid: readonly Lesson[] = [
            link({
                id: "parent-link",
                href: "/parent/",
                children: [
                    link({
                        id: "child-link",
                        href: "/parent/child",
                    }),
                ],
            }),
        ];

        expect(() => {
            validateCourseStructure(invalid);
        }).toThrow(/"\/parent\/child" must end with trailing slash/);
    });
});
