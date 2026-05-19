import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    buildArtifact,
    findNode,
    graphOf,
    idsOf,
    lessonNode,
    personAda,
    prefixBlock,
    referenceChapter1,
    referenceVideo1,
    semanticGraph,
    shuffleStatements,
    usageNode,
    validBaseFixture,
    workBook1,
} from "./build-bibliography-catalog.support";

describe("buildCatalogArtifactFromTurtle property-based invariants", () => {
    // Skip this property-based test in CI: fast-check generates many property combinations
    // that exceed the 5000ms timeout on resource-constrained runners (e.g., Raspberry Pi with
    // 906 MiB RAM). Runs locally for full coverage during development.
    it.skipIf(process.env.CI)("keeps the semantic graph invariant under reordering of Turtle statements", async () => {
        const bodyStatementCount = validBaseFixture
            .trim()
            .split(/\n\s*\n/)
            .filter(Boolean)
            .length - 1;

        await fc.assert(
            fc.asyncProperty(fc.shuffledSubarray(
                Array.from({ length: bodyStatementCount }, (_, index) => index),
                { minLength: bodyStatementCount, maxLength: bodyStatementCount },
            ), async (permutation) => {
                const baseArtifact = buildArtifact(validBaseFixture, "statement-order-base.ttl");
                const shuffledArtifact = buildArtifact(
                    shuffleStatements(validBaseFixture, permutation),
                    "statement-order-shuffled.ttl",
                );

                expect(semanticGraph(shuffledArtifact)).toEqual(semanticGraph(baseArtifact));
            }),
        );
    });

    it("never emits duplicate @id values", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.subarray([
                    usageNode("lesson-a-chapter-1-rec", "/notes/lesson-a/", "ref:chapter-1", "recommended"),
                    usageNode("lesson-a-chapter-1-add", "/notes/lesson-a/", "ref:chapter-1", "additional"),
                    usageNode("lesson-a-video-1-add", "/notes/lesson-a/", "ref:video-1", "additional"),
                    usageNode("lesson-b-chapter-1-rec", "/notes/lesson-b/", "ref:chapter-1", "recommended"),
                ], { minLength: 1, maxLength: 4 }),
                async (usages) => {
                    const ttl = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${referenceVideo1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${lessonNode("/notes/lesson-b/", "Lesson B")}
${usages.join("\n")}
`;
                    const graph = graphOf(ttl, "unique-ids.ttl");
                    const ids = idsOf(graph);
                    expect(new Set(ids).size).toBe(ids.length);
                },
            ),
        );
    });

    it("rejects any unsupported dibs:tag value", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.stringMatching(/^[A-Za-z0-9_-]+$/).filter((tag) =>
                    tag.length > 0
                    && !["recommended", "additional", "pending-revision"].includes(tag)
                ),
                async (tag) => {
                    const ttl = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${usageNode("lesson-a-invalid-tag", "/notes/lesson-a/", "ref:chapter-1", tag)}
`;

                    expect(() => buildArtifact(ttl, "pbt-invalid-tag.ttl")).toThrow(
                        /\[pbt-invalid-tag\.ttl\].*unsupported tag/,
                    );
                },
            ),
        );
    });

    it("emits usages that only point to emitted lessons and references", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.subarray([
                    usageNode("lesson-a-chapter-1-rec", "/notes/lesson-a/", "ref:chapter-1", "recommended"),
                    usageNode("lesson-a-video-1-add", "/notes/lesson-a/", "ref:video-1", "additional"),
                    usageNode("lesson-b-chapter-1-pending", "/notes/lesson-b/", "ref:chapter-1", "pending-revision"),
                ], { minLength: 1, maxLength: 3 }),
                async (usages) => {
                    const ttl = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${referenceVideo1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${lessonNode("/notes/lesson-b/", "Lesson B")}
${usages.join("\n")}
`;

                    const graph = graphOf(ttl, "pbt-reference-integrity.ttl");
                    const ids = new Set(idsOf(graph));
                    const usageNodes = graph.filter((node) => node["@type"] === "dibs:ReferenceUsage");

                    for (const usage of usageNodes) {
                        const lessonId = (usage["dibs:lesson"] as { "@id": string })["@id"];
                        const referenceId = (usage["dibs:reference"] as { "@id": string })["@id"];
                        expect(ids.has(lessonId)).toBe(true);
                        expect(ids.has(referenceId)).toBe(true);
                    }
                },
            ),
        );
    });

    it("never keeps pending-revision usages that only point to unsupported nodes", async () => {
        await fc.assert(
            fc.asyncProperty(fc.constantFrom("pending-revision"), async (tag) => {
                const ttl = `
${prefixBlock}
ref:draft-video a schema:MediaObject ;
  schema:name "Internal draft video" .

${lessonNode("/notes/lesson-draft/", "Draft lesson")}
${usageNode("lesson-draft-video", "/notes/lesson-draft/", "ref:draft-video", tag)}
`;

                const graph = graphOf(ttl, "pbt-pending-prune.ttl");
                expect(findNode(graph, "ref:draft-video")).toBeUndefined();
                expect(findNode(graph, "usage:lesson-draft-video")).toBeUndefined();
                expect(findNode(graph, "/notes/lesson-draft/")).toBeDefined();
            }),
        );
    });
});
