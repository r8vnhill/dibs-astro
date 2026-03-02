import { describe, expect, it } from "vitest";
import { Lesson } from "$domain/entities/Lesson";
import { LessonHref } from "$domain/value-objects/LessonHref";
import { LessonId } from "$domain/value-objects/LessonId";
import { LessonSlug } from "$domain/value-objects/LessonSlug";

describe("Lesson domain stubs", () => {
    it("creates LessonId from non-empty value", () => {
        const id = LessonId.create("lesson-1");

        expect(id.value).toBe("lesson-1");
    });

    it("normalizes LessonSlug from title-like input", () => {
        const slug = LessonSlug.create("Lesson Intro TS");

        expect(slug.value).toBe("lesson-intro-ts");
    });

    it("normalizes LessonHref with trailing slash", () => {
        const href = LessonHref.create("/notes/unit-1/lesson-1");

        expect(href.value).toBe("/notes/unit-1/lesson-1/");
    });

    it("creates Lesson entity with required value objects", () => {
        const lesson = Lesson.create({
            id: LessonId.create("lesson-1"),
            title: "Lesson 1",
            slug: LessonSlug.create("lesson-1"),
            href: LessonHref.create("/notes/unit-1/lesson-1/"),
        });

        expect(lesson.id.value).toBe("lesson-1");
        expect(lesson.title).toBe("Lesson 1");
        expect(lesson.slug.value).toBe("lesson-1");
        expect(lesson.href?.value).toBe("/notes/unit-1/lesson-1/");
    });
});
