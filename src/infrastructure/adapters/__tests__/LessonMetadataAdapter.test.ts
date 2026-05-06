import { LessonHref } from "@ravenhill/content-core";
import { describe, expect, it } from "vitest";
import type { ReadonlyLessonMetadataDataset } from "~/utils/lesson-metadata";
import { LessonMetadataAdapter } from "../LessonMetadataAdapter";

const makeDataset = (): ReadonlyLessonMetadataDataset => ({
    generatedAt: "2026-04-19T00:00:00.000Z",
    totalLessons: 1,
    changesLimit: 5,
    entries: {
        "/notes/unit1/lesson1/": {
            sourceFile: "src/pages/notes/unit1/lesson1/index.astro",
            authors: [{ name: "Ada Lovelace", url: "https://example.com/ada" }],
            lastModified: "2026-04-10",
            changes: [
                {
                    hash: "abc1234",
                    date: "2026-04-10",
                    author: "Ada Lovelace",
                    subject: "feat: adapter coverage",
                },
            ],
        },
    },
});

describe("LessonMetadataAdapter", () => {
    it("resuelve metadata conocida desde el dataset generado", async () => {
        const adapter = new LessonMetadataAdapter(makeDataset());

        await expect(adapter.findByHref(LessonHref.create("/notes/unit1/lesson1/"))).resolves.toEqual(
            {
                kind: "found",
                metadata: {
                    sourceFile: "src/pages/notes/unit1/lesson1/index.astro",
                    authors: [{ name: "Ada Lovelace", url: "https://example.com/ada" }],
                    lastModified: "2026-04-10",
                    changes: [
                        {
                            hash: "abc1234",
                            date: "2026-04-10",
                            author: "Ada Lovelace",
                            subject: "feat: adapter coverage",
                        },
                    ],
                },
            },
        );
    });

    it("devuelve missing cuando el href canónico no existe", async () => {
        const adapter = new LessonMetadataAdapter(makeDataset());
        const href = LessonHref.create("/notes/unit1/missing/");

        await expect(adapter.findByHref(href)).resolves.toEqual({
            kind: "missing",
            href,
        });
    });

    it("devuelve invalid para un registro coincidente con campos inválidos", async () => {
        const dataset: ReadonlyLessonMetadataDataset = {
            ...makeDataset(),
            entries: {
                "/notes/unit1/lesson1/": {
                    sourceFile: "https://example.com/lesson",
                    authors: [{ name: "   ", url: "mailto:ada@example.com" }],
                    lastModified: "2026-02-30",
                    changes: [
                        {
                            hash: "g123456",
                            date: "2026-04-31",
                            author: "",
                            subject: "   ",
                        },
                    ],
                },
            },
        };
        const adapter = new LessonMetadataAdapter(dataset);
        const href = LessonHref.create("/notes/unit1/lesson1/");

        await expect(adapter.findByHref(href)).resolves.toEqual({
            kind: "invalid",
            href,
            issues: [
                {
                    path: "sourceFile",
                    field: "sourceFile",
                    message: "Expected a non-empty source file path.",
                },
                {
                    path: "authors[0].name",
                    field: "name",
                    message: "Expected non-empty text.",
                },
                {
                    path: "authors[0].url",
                    field: "url",
                    message: "Expected an http or https URL.",
                },
                {
                    path: "lastModified",
                    field: "lastModified",
                    message: "Expected a real ISO short date.",
                },
                {
                    path: "changes[0].hash",
                    field: "hash",
                    message: "Expected a git commit hash.",
                },
                {
                    path: "changes[0].date",
                    field: "date",
                    message: "Expected a real ISO short date.",
                },
                {
                    path: "changes[0].author",
                    field: "author",
                    message: "Expected non-empty text.",
                },
                {
                    path: "changes[0].subject",
                    field: "subject",
                    message: "Expected non-empty text.",
                },
            ],
        });
    });
});
