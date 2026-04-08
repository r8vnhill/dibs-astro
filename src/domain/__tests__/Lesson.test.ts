import { Lesson } from "$domain/entities/Lesson";
import { LessonHref } from "$domain/value-objects/LessonHref";
import { LessonId } from "$domain/value-objects/LessonId";
import { LessonSlug } from "$domain/value-objects/LessonSlug";
import { LessonTitle } from "$domain/value-objects/LessonTitle";
import { describe, expect, it } from "vitest";

// ─── LessonId ────────────────────────────────────────────────────────────────

describe("LessonId", () => {
    it("stores the given value", () => {
        expect(LessonId.create("lesson-1").value).toBe("lesson-1");
    });

    it("trims surrounding whitespace", () => {
        expect(LessonId.create("  lesson-1  ").value).toBe("lesson-1");
    });

    it("throws for empty string", () => {
        expect(() => LessonId.create("")).toThrow();
    });

    it("throws for whitespace-only input", () => {
        expect(() => LessonId.create("   ")).toThrow();
    });
});

// ─── LessonSlug ──────────────────────────────────────────────────────────────

describe("LessonSlug", () => {
    it("normalizes from title-like input", () => {
        expect(LessonSlug.create("Lesson Intro TS").value).toBe("lesson-intro-ts");
    });

    it("lowercases the input", () => {
        expect(LessonSlug.create("Hello-World").value).toBe("hello-world");
    });

    it("collapses multiple separators into one dash", () => {
        expect(LessonSlug.create("foo  bar--baz").value).toBe("foo-bar-baz");
    });

    it("throws for blank input", () => {
        expect(() => LessonSlug.create("   ")).toThrow();
    });
});

// ─── LessonHref ──────────────────────────────────────────────────────────────

describe("LessonHref", () => {
    it("trims surrounding whitespace", () => {
        expect(LessonHref.create("  /notes/unit-1/lesson-1/  ").value).toBe(
            "/notes/unit-1/lesson-1/",
        );
    });

    it("adds leading slash when missing", () => {
        expect(LessonHref.create("notes/unit-1/lesson-1").value).toBe(
            "/notes/unit-1/lesson-1/",
        );
    });

    it("enforces trailing slash", () => {
        expect(LessonHref.create("/notes/unit-1/lesson-1").value).toBe(
            "/notes/unit-1/lesson-1/",
        );
    });

    it("collapses repeated slashes", () => {
        expect(LessonHref.create("//notes///unit-1//lesson-1//").value).toBe(
            "/notes/unit-1/lesson-1/",
        );
    });

    it("strips query parameters", () => {
        expect(LessonHref.create("/notes/unit-1/lesson-1/?lang=es").value).toBe(
            "/notes/unit-1/lesson-1/",
        );
    });

    it("strips hash fragments", () => {
        expect(LessonHref.create("/notes/unit-1/lesson-1/#intro").value).toBe(
            "/notes/unit-1/lesson-1/",
        );
    });

    it("is idempotent for canonical values", () => {
        const canonical = LessonHref.create("/notes/unit-1/lesson-1/");

        expect(LessonHref.create(canonical.value).value).toBe(canonical.value);
    });

    it("preserves root", () => {
        expect(LessonHref.create("/").value).toBe("/");
    });

    it("rejects empty string", () => {
        expect(() => LessonHref.create("")).toThrow("LessonHref cannot be empty");
    });

    it("rejects whitespace-only input", () => {
        expect(() => LessonHref.create("   ")).toThrow("LessonHref cannot be empty");
    });
});

// ─── LessonTitle ─────────────────────────────────────────────────────────────
// Cycle 3: new value object encapsulating title invariants.

describe("LessonTitle", () => {
    it("stores the trimmed value", () => {
        expect(LessonTitle.create("  Hello World  ").value).toBe("Hello World");
    });

    it("preserves internal spacing", () => {
        expect(LessonTitle.create("Hello   World").value).toBe("Hello   World");
    });

    it("throws for empty string", () => {
        expect(() => LessonTitle.create("")).toThrow("Lesson title cannot be empty");
    });

    it("throws for whitespace-only input", () => {
        expect(() => LessonTitle.create("   ")).toThrow("Lesson title cannot be empty");
    });
});

// ─── Lesson ───────────────────────────────────────────────────────────────────
// Cycles 4–6: Lesson composes value objects; href is always derived from slug.

describe("Lesson", () => {
    const id = LessonId.create("lesson-1");
    const slug = LessonSlug.create("lesson-1");
    const title = LessonTitle.create("Lesson 1");

    describe("Lesson.create", () => {
        it("creates a lesson with valid value objects", () => {
            const lesson = Lesson.create({ id, title, slug });

            expect(lesson.id.value).toBe("lesson-1");
            expect(lesson.title.value).toBe("Lesson 1");
            expect(lesson.slug.value).toBe("lesson-1");
        });

        it("derives href from slug", () => {
            const lesson = Lesson.create({ id, title, slug });

            expect(lesson.href.value).toBe("/notes/lesson-1/");
        });

        it("href always starts with /notes/", () => {
            const lesson = Lesson.create({ id, title, slug });

            expect(lesson.href.value).toMatch(/^\/notes\//);
        });

        it("href always ends with /", () => {
            const lesson = Lesson.create({ id, title, slug });

            expect(lesson.href.value).toMatch(/\/$/);
        });

        it("different slugs produce different hrefs", () => {
            const other = Lesson.create({
                id: LessonId.create("lesson-2"),
                title: LessonTitle.create("Lesson 2"),
                slug: LessonSlug.create("lesson-2"),
            });

            expect(other.href.value).toBe("/notes/lesson-2/");
        });

        it("href value matches /notes/{slug}/", () => {
            // Cycle 5: explicit contract — href = /notes/${slug}/
            const s = LessonSlug.create("my-lesson");
            const lesson = Lesson.create({ id, title, slug: s });

            expect(lesson.href.value).toBe(`/notes/${s.value}/`);
        });
    });
});
