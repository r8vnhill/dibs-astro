import { LessonHref } from "../../navigation/lesson-href";
import { beforeEach, describe, expect, it } from "vitest";
import { LessonMetadataService } from "../lesson-metadata-service";
import type { LessonMetadataRepository } from "../repositories";

describe("LessonMetadataService", () => {
    let lessonMetadataService: LessonMetadataService;
    let lessonMetadataRepository: LessonMetadataRepository;
    let receivedHref: LessonHref | undefined;

    beforeEach(() => {
        lessonMetadataRepository = {
            findByHref: async (href: LessonHref) => {
                receivedHref = href;

                if (href.value !== "/notes/unit1/lesson1/") {
                    return undefined;
                }

                return {
                    sourceFile: "src/pages/notes/unit1/lesson1/index.astro",
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
                };
            },
        };

        lessonMetadataService = new LessonMetadataService(lessonMetadataRepository);
        receivedHref = undefined;
    });

    it("canonicaliza el pathname antes de delegar al repositorio", async () => {
        await lessonMetadataService.resolveLessonMetadata(" notes//unit1/lesson1?lang=es#intro ");

        expect(receivedHref?.value).toBe("/notes/unit1/lesson1/");
    });

    it("devuelve undefined cuando el repositorio no encuentra metadata", async () => {
        const result = await lessonMetadataService.resolveLessonMetadata("/notes/unknown/");

        expect(result).toBeUndefined();
    });

    it("mapea el resultado del repositorio al DTO esperado por presentation", async () => {
        const result = await lessonMetadataService.resolveLessonMetadata("/notes/unit1/lesson1/");

        expect(result).toEqual({
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
        });
    });
});
