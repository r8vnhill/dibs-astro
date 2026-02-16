import {
    buildLessonMetadataEntry,
    parseGitLogLine,
    parseGitLogOutput,
    resolveAuthors,
    toIsoShortDate,
    sourceFileToLessonPath,
} from "../git-metadata.js";

describe("sourceFileToLessonPath", () => {
    it.each([
        ["src/pages/index.astro", "/"],
        ["src/pages/foo/index.astro", "/foo/"],
        ["src/pages/foo.astro", "/foo/"],
        [
            "src\\pages\\notes\\software-libraries\\scripting\\first-script\\index.astro",
            "/notes/software-libraries/scripting/first-script/",
        ],
    ])("maps %s to %s", (input, expected) => {
        expect(sourceFileToLessonPath(input)).toBe(expected);
    });

    it.each([
        "src/pages/foo.txt",
        "src/pagesbar/foo.astro",
        "other/path/file.astro",
    ])("returns undefined for invalid source paths: %s", (input) => {
        expect(sourceFileToLessonPath(input)).toBeUndefined();
    });
});

describe("parseGitLogOutput", () => {
    it("parses git lines with ISO short dates", () => {
        const parsed = parseGitLogOutput(
            [
                "abc123|2026-02-11|r8vnhill|feat: update lesson",
                "def456|2025-10-24|r8vnhill|fix: typo",
            ].join("\n"),
        );

        expect(parsed).toEqual([
            {
                hash: "abc123",
                date: "2026-02-11",
                author: "r8vnhill",
                subject: "feat: update lesson",
            },
            {
                hash: "def456",
                date: "2025-10-24",
                author: "r8vnhill",
                subject: "fix: typo",
            },
        ]);
    });

    it("preserves subjects containing delimiter characters", () => {
        const parsed = parseGitLogOutput("abc123|2026-02-11|r8vnhill|feat: foo | bar | baz");
        expect(parsed[0]?.subject).toBe("feat: foo | bar | baz");
    });

    it("drops lines with invalid dates", () => {
        const parsed = parseGitLogOutput("abc123|02/11/2026|r8vnhill|feat: update lesson");
        expect(parsed).toEqual([]);
    });
});

describe("parseGitLogLine", () => {
    it("returns undefined when fields are missing", () => {
        expect(parseGitLogLine("abc123|2026-02-11")).toBeUndefined();
    });
});

describe("toIsoShortDate", () => {
    it.each([
        ["2026-02-16", "2026-02-16"],
        [" 2026-02-16 ", "2026-02-16"],
    ])("keeps valid ISO short date %s", (input, expected) => {
        expect(toIsoShortDate(input)).toBe(expected);
    });

    it.each(["16-02-2026", "02/16/2026", "2026-2-16", "invalid"])(
        "returns undefined for non ISO format: %s",
        (input) => {
            expect(toIsoShortDate(input)).toBeUndefined();
        },
    );
});

describe("resolveAuthors", () => {
    it("uses configured fallback author when provided", () => {
        expect(resolveAuthors("/notes/example/", {}, "Proyecto DIBS")).toEqual([
            { name: "Proyecto DIBS" },
        ]);
    });

    it("returns empty list when no author and no fallback is provided", () => {
        expect(resolveAuthors("/notes/example/", {})).toEqual([]);
    });
});

describe("buildLessonMetadataEntry", () => {
    it("builds entry with lastModified from newest git event", () => {
        const changes = parseGitLogOutput("abc123|2026-02-11|r8vnhill|feat: update lesson");
        const entry = buildLessonMetadataEntry(
            "src/pages/notes/software-libraries/scripting/first-script/index.astro",
            changes,
            {},
            "src/pages",
            "Proyecto DIBS",
        );

        expect(entry).toEqual({
            path: "/notes/software-libraries/scripting/first-script/",
            sourceFile: "src/pages/notes/software-libraries/scripting/first-script/index.astro",
            authors: [{ name: "Proyecto DIBS" }],
            lastModified: "2026-02-11",
            changes: [
                {
                    hash: "abc123",
                    date: "2026-02-11",
                    author: "r8vnhill",
                    subject: "feat: update lesson",
                },
            ],
        });
    });

    it("derives lastModified from latest change by date, not array position", () => {
        const entry = buildLessonMetadataEntry(
            "src/pages/notes/software-libraries/scripting/first-script/index.astro",
            [
                { hash: "old1", date: "2025-01-01", author: "a", subject: "old" },
                { hash: "new1", date: "2026-01-01", author: "b", subject: "new" },
            ],
            {},
        );

        expect(entry?.lastModified).toBe("2026-01-01");
    });

    it("uses configured fallback author in metadata entry", () => {
        const entry = buildLessonMetadataEntry(
            "src/pages/notes/software-libraries/scripting/first-script/index.astro",
            [],
            {},
            "src/pages",
            "Proyecto DIBS",
        );
        expect(entry?.authors).toEqual([{ name: "Proyecto DIBS" }]);
    });
});
