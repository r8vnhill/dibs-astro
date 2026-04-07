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
    usageNode,
    workBook1,
} from "./build-bibliography-catalog.support";

describe("buildCatalogArtifactFromTurtle pending-revision pruning", () => {
    it("prunes pending-only unsupported references and usages while keeping supported lessons", () => {
        const pendingDraft = `
${prefixBlock}
ref:draft-video a schema:MediaObject ;
  schema:name "Internal draft video" .

${lessonNode("/notes/lesson-draft/", "Draft lesson")}
${usageNode("lesson-draft-video", "/notes/lesson-draft/", "ref:draft-video", "pending-revision")}
`;

        const graph = graphOf(pendingDraft, "pending-draft.ttl");

        expect(idsOf(graph)).toEqual(["/notes/lesson-draft/"]);
        expect(findNode(graph, "/notes/lesson-draft/")).toEqual({
            "@id": "/notes/lesson-draft/",
            "@type": "LearningResource",
            name: "Draft lesson",
            url: "/notes/lesson-draft/",
        });
        expect(findNode(graph, "ref:draft-video")).toBeUndefined();
        expect(findNode(graph, "usage:lesson-draft-video")).toBeUndefined();
    });

    it("keeps pending-revision usages when both lesson and reference are supported", () => {
        const ttl = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${usageNode("lesson-a-chapter-1", "/notes/lesson-a/", "ref:chapter-1", "pending-revision")}
`;

        const graph = graphOf(ttl, "pending-valid.ttl");

        expect(findNode(graph, "ref:chapter-1")).toBeDefined();
        expect(findNode(graph, "/notes/lesson-a/")).toBeDefined();
        expect(findNode(graph, "usage:lesson-a-chapter-1")).toEqual({
            "@id": "usage:lesson-a-chapter-1",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/lesson-a/" },
            "dibs:reference": { "@id": "ref:chapter-1" },
            "dibs:tags": ["pending-revision"],
        });
    });

    it("still fails on unsupported reference types outside pending-revision", () => {
        const ttl = `
${prefixBlock}
${lessonNode("/notes/lesson-a/", "Lesson A")}
ref:draft-video a schema:MediaObject ;
  schema:name "Internal draft video" .

${usageNode("lesson-a-draft-video", "/notes/lesson-a/", "ref:draft-video", "additional")}
`;

        expect(() => buildArtifact(ttl, "pending-policy-boundary.ttl")).toThrow(
            /\[pending-policy-boundary\.ttl\].*unsupported type "MediaObject"/,
        );
    });
});
