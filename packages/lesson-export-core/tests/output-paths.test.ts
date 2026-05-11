import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { derivePdfOutputPath, isSafePdfOutputPath } from "../src";

describe("given PDF output-path derivation", () => {
    test.each([
        ["/notes/", "notes/index.pdf"],
        ["/notes/software-libraries/", "notes/software-libraries/index.pdf"],
        ["/notes/software-libraries/foo/", "notes/software-libraries/foo.pdf"],
        ["notes/software-libraries/foo", "notes/software-libraries/foo.pdf"],
    ])("then %s derives %s", (route, expected) => {
        expect(derivePdfOutputPath(route)).toBe(expected);
    });

    test("then it can add a safe root directory", () => {
        expect(derivePdfOutputPath("/notes/software-libraries/foo/", { rootDir: "dist-pdf" })).toBe(
            "dist-pdf/notes/software-libraries/foo.pdf",
        );
    });

    test.each([
        "/notes/foo.pdf",
        "C:\\notes\\foo.pdf",
        "notes\\foo.pdf",
        "../notes/foo.pdf",
        "notes/../foo.pdf",
        "notes/foo",
        "notes/foo.html",
        "notes//foo.pdf",
    ])("then unsafe path %s is detected", (path) => {
        expect(isSafePdfOutputPath(path)).toBe(false);
    });

    test("then derived paths keep safe path invariants", () => {
        const segment = fc.stringMatching(/^[A-Za-z0-9_-]{1,24}$/);

        fc.assert(
            fc.property(fc.array(segment, { minLength: 1, maxLength: 5 }), (segments) => {
                const outputPath = derivePdfOutputPath(`/notes/${segments.join("/")}/`);

                expect(outputPath.startsWith("/")).toBe(false);
                expect(outputPath.includes("\\")).toBe(false);
                expect(outputPath.includes("..")).toBe(false);
                expect(outputPath.endsWith(".pdf")).toBe(true);
            }),
        );
    });
});
