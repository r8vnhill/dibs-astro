import {
    type AbsoluteUrl,
    type GitCommitHash,
    type IsoShortDate,
    type LessonSourceFile,
    type NonEmptyText,
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
} from "@ravenhill/content-core";
import { assertType, test } from "vitest";

test("branded parsers expose branded return types from the package root", () => {
    const text = parseNonEmptyText("Ada Lovelace");
    const url = parseAbsoluteUrl("https://example.com");
    const hash = parseGitCommitHash("abc1234");
    const date = parseIsoShortDateValue("2026-05-07");
    const sourceFile = parseLessonSourceFile("notes/index.astro");

    if (text !== undefined) {
        assertType<NonEmptyText>(text);
    }

    if (url !== undefined) {
        assertType<AbsoluteUrl>(url);
    }

    if (hash !== undefined) {
        assertType<GitCommitHash>(hash);
    }

    if (date !== undefined) {
        assertType<IsoShortDate>(date);
    }

    if (sourceFile !== undefined) {
        assertType<LessonSourceFile>(sourceFile);
    }
});
