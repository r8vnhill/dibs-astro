import { describe, expect, it } from "vitest";
import {
    buildArtifact,
    lessonNode,
    personAda,
    prefixBlock,
    referenceChapter1,
    usageNode,
    validBaseFixture,
    workBook1,
} from "./build-bibliography-catalog.support";

describe("buildCatalogArtifactFromTurtle usage validation", () => {
    it.each([
        ["draft"],
        ["internal"],
        ["hidden"],
    ])("fails on unsupported usage tag %s", (tag) => {
        const invalid = `
${validBaseFixture}
${usageNode("lesson-a-bad-tag", "/notes/lesson-a/", "ref:chapter-1", tag)}
`;

        expect(() => buildArtifact(invalid, "invalid-tags.ttl")).toThrow(
            /\[invalid-tags\.ttl\].*unsupported tag/,
        );
    });

    it.each([
        [
            "dibs:lesson",
            "missing-dibs:lesson.ttl",
            `
usage:missing-lesson a dibs:ReferenceUsage ;
  dibs:reference ref:chapter-1 ;
  dibs:tag "recommended" .
`,
            /\[missing-dibs:lesson\.ttl\].*missing dibs:lesson/,
        ],
        [
            "dibs:reference",
            "missing-dibs:reference.ttl",
            `
usage:missing-reference a dibs:ReferenceUsage ;
  dibs:lesson <https://dibs.ravenhill.cl/notes/lesson-a/> ;
  dibs:tag "recommended" .
`,
            /\[missing-dibs:reference\.ttl\].*missing dibs:reference/,
        ],
        [
            "dibs:tag",
            "missing-dibs:tag.ttl",
            `
usage:missing-tag a dibs:ReferenceUsage ;
  dibs:lesson <https://dibs.ravenhill.cl/notes/lesson-a/> ;
  dibs:reference ref:chapter-1 .
`,
            /\[missing-dibs:tag\.ttl\].*missing dibs:tag/,
        ],
    ])("fails when usage is missing %s", (_fieldName, sourceLabel, usageSnippet, errorPattern) => {
        const invalid = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${usageSnippet}
`;

        expect(() => buildArtifact(invalid, sourceLabel)).toThrow(errorPattern);
    });

    it.each([
        [
            "missing lesson node",
            `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${usageNode("broken", "/notes/missing/", "ref:chapter-1", "recommended")}
`,
            "missing-lesson-node.ttl",
            /\[missing-lesson-node\.ttl\].*points to missing node/,
        ],
        [
            "missing reference node",
            `
${prefixBlock}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${usageNode("broken", "/notes/lesson-a/", "ref:missing", "recommended")}
`,
            "missing-reference-node.ttl",
            /\[missing-reference-node\.ttl\].*points to missing node/,
        ],
        [
            "invalid lesson type",
            `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
usage:broken a dibs:ReferenceUsage ;
  dibs:lesson ref:chapter-1 ;
  dibs:reference ref:chapter-1 ;
  dibs:tag "recommended" .
`,
            "invalid-lesson-type.ttl",
            /\[invalid-lesson-type\.ttl\].*invalid type "Book"/,
        ],
        [
            "invalid reference type outside pruning",
            `
${prefixBlock}
${lessonNode("/notes/lesson-a/", "Lesson A")}
ref:draft-video a schema:MediaObject ;
  schema:name "Internal draft video" .

${usageNode("broken", "/notes/lesson-a/", "ref:draft-video", "recommended")}
`,
            "invalid-reference-type.ttl",
            /\[invalid-reference-type\.ttl\].*unsupported type "MediaObject"/,
        ],
    ])("fails on %s", (_label, ttl, sourceLabel, errorPattern) => {
        expect(() => buildArtifact(ttl, sourceLabel)).toThrow(errorPattern);
    });

    it("fails on unsupported standalone nodes without usage", () => {
        const invalid = `
${prefixBlock}
ref:draft-video a schema:MediaObject ;
  schema:name "Internal draft video" .
`;

        expect(() => buildArtifact(invalid, "unsupported-standalone.ttl")).toThrow(
            /\[unsupported-standalone\.ttl\].*unsupported type "MediaObject"/,
        );
    });
});
