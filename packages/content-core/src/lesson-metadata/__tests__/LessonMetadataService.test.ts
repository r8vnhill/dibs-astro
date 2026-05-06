import { LessonHref } from "../../navigation/lesson-href";
import { beforeEach, describe, expect, it } from "vitest";
import {
    parseGitCommitHash,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
} from "../branded-values";
import { LessonMetadataService } from "../lesson-metadata-service";
import type { LessonMetadataRepository } from "../repositories";
import type { LessonMetadataRecord } from "../records";

const createMetadataRecord = (): LessonMetadataRecord => ({
    sourceFile: parseLessonSourceFile("src/pages/notes/unit1/lesson1/index.astro")!,
    authors: [
        { name: parseNonEmptyText("Ada Lovelace")! },
        { name: parseNonEmptyText("Grace Hopper")! },
    ],
    lastModified: parseIsoShortDateValue("2026-04-10"),
    changes: [
        {
            hash: parseGitCommitHash("abc1234")!,
            date: parseIsoShortDateValue("2026-04-10")!,
            author: parseNonEmptyText("Ada Lovelace")!,
            subject: parseNonEmptyText("feat: update lesson metadata seam")!,
        },
    ],
});

describe("LessonMetadataService", () => {
    let lessonMetadataService: LessonMetadataService;
    let lessonMetadataRepository: LessonMetadataRepository;
    let receivedHref: LessonHref | undefined;

    beforeEach(() => {
        lessonMetadataRepository = {
            findByHref: async (href: LessonHref) => {
                receivedHref = href;

                if (href.value !== "/notes/unit1/lesson1/") {
                    return { kind: "missing", href };
                }

                return { kind: "found", metadata: createMetadataRecord() };
            },
        };

        lessonMetadataService = new LessonMetadataService(lessonMetadataRepository);
        receivedHref = undefined;
    });

    it("canonicaliza el pathname antes de delegar al repositorio", async () => {
        await lessonMetadataService.resolveLessonMetadata(" notes//unit1/lesson1?lang=es#intro ");

        expect(receivedHref?.value).toBe("/notes/unit1/lesson1/");
    });

    it("devuelve missing cuando el repositorio no encuentra metadata", async () => {
        const result = await lessonMetadataService.resolveLessonMetadata("/notes/unknown/");

        expect(result).toEqual({
            kind: "missing",
            href: LessonHref.create("/notes/unknown/"),
        });
    });

    it("mapea el resultado encontrado al DTO esperado por presentation", async () => {
        const result = await lessonMetadataService.resolveLessonMetadata("/notes/unit1/lesson1/");

        expect(result).toEqual({
            kind: "found",
            metadata: {
                authors: [{ name: "Ada Lovelace" }, { name: "Grace Hopper" }],
                lastModified: "2026-04-10",
                changes: [
                    {
                        hash: "abc1234",
                        date: "2026-04-10",
                        author: "Ada Lovelace",
                        subject: "feat: update lesson metadata seam",
                    },
                ],
            },
            displayDate: {
                kind: "formatted",
                value: "10 de abril de 2026",
            },
        });
    });

    it("preserva resultados invalid del repositorio", async () => {
        lessonMetadataRepository = {
            findByHref: async (href: LessonHref) => ({
                kind: "invalid",
                href,
                issues: [{
                    path: "authors[0].name",
                    field: "name",
                    message: "Expected non-empty text.",
                }],
            }),
        };
        lessonMetadataService = new LessonMetadataService(lessonMetadataRepository);

        const result = await lessonMetadataService.resolveLessonMetadata("/notes/unit1/lesson1/");

        expect(result).toEqual({
            kind: "invalid",
            href: LessonHref.create("/notes/unit1/lesson1/"),
            issues: [{
                path: "authors[0].name",
                field: "name",
                message: "Expected non-empty text.",
            }],
        });
    });
});
