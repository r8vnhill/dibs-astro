import { LessonHref } from "$domain/value-objects/LessonHref";
import { describe, expect, it } from "vitest";
import type { LessonMetadataDataset } from "~/utils/lesson-metadata";
import { LessonMetadataAdapter } from "../LessonMetadataAdapter";

const makeDataset = (): LessonMetadataDataset => ({
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
        );
    });

    it("devuelve undefined cuando el href canónico no existe", async () => {
        const adapter = new LessonMetadataAdapter(makeDataset());

        await expect(adapter.findByHref(LessonHref.create("/notes/unit1/missing/"))).resolves.toBe(
            undefined,
        );
    });
});
