import { describe, expect, it } from "vitest";
import {
    isKnownShikiAlias,
    normalizeShikiLanguage,
    resolveShikiLanguage,
    availableLanguages,
    languageAliases,
} from "../src/languages/resolution";

/**
 * Contract tests for language resolution and alias handling.
 *
 * These tests verify alias recognition, language resolution, and warning logic.
 */
describe("language resolution", () => {
    describe("isKnownShikiAlias", () => {
        it.each([
            "py",
            "javascript",
            "json",
            "md",
            "sh",
            "plaintext",
        ])("recognizes known alias: %s", (alias) => {
            expect(isKnownShikiAlias(alias)).toBe(true);
        });

        it.each([
            "unknown-lang",
            "xyz",
            "fakescript",
        ])("rejects unknown alias: %s", (alias) => {
            expect(isKnownShikiAlias(alias)).toBe(false);
        });

        it("is case-insensitive", () => {
            expect(isKnownShikiAlias("PY")).toBe(true);
            expect(isKnownShikiAlias("JavaScript")).toBe(true);
            expect(isKnownShikiAlias("PLAINTEXT")).toBe(true);
        });
    });

    describe("resolveShikiLanguage", () => {
        it.each([
            { input: "py", expected: "python", shouldWarn: false },
            { input: "javascript", expected: "javascript", shouldWarn: false },
            { input: "md", expected: "markdown", shouldWarn: false },
            { input: "sh", expected: "bash", shouldWarn: false },
            { input: "nu", expected: "nushell", shouldWarn: false },
        ])("resolves known alias: $input -> $expected", ({ input, expected, shouldWarn }) => {
            const result = resolveShikiLanguage(input);
            expect(result.resolvedLang).toBe(expected);
            expect(result.shouldWarn).toBe(shouldWarn);
        });

        it("returns null for plaintext without warning", () => {
            const result = resolveShikiLanguage("plaintext");
            expect(result.resolvedLang).toBeNull();
            expect(result.shouldWarn).toBe(false);
        });

        it("returns unknown language with warning", () => {
            const result = resolveShikiLanguage("unknown-lang-xyz");
            expect(result.resolvedLang).toBeNull();
            expect(result.shouldWarn).toBe(true);
        });

        it("is case-insensitive", () => {
            const result1 = resolveShikiLanguage("PY");
            expect(result1.resolvedLang).toBe("python");

            const result2 = resolveShikiLanguage("JavaScript");
            expect(result2.resolvedLang).toBe("javascript");
        });

        it("recognizes bundled languages directly", () => {
            const result = resolveShikiLanguage("python");
            expect(result.resolvedLang).toBe("python");
            expect(result.shouldWarn).toBe(false);
        });
    });

    describe("normalizeShikiLanguage", () => {
        it("produces same result as resolveShikiLanguage", () => {
            const input = "py";
            expect(normalizeShikiLanguage(input)).toEqual(resolveShikiLanguage(input));
        });

        it("is callable and functional", () => {
            const result = normalizeShikiLanguage("md");
            expect(result.resolvedLang).toBe("markdown");
            expect(result.shouldWarn).toBe(false);
        });
    });

    describe("availableLanguages", () => {
        it("is a non-empty array", () => {
            expect(Array.isArray(availableLanguages)).toBe(true);
            expect(availableLanguages.length).toBeGreaterThan(0);
        });

        it("includes common bundled languages", () => {
            expect(availableLanguages).toContain("python");
            expect(availableLanguages).toContain("javascript");
            expect(availableLanguages).toContain("json");
            expect(availableLanguages).toContain("markdown");
            expect(availableLanguages).toContain("bash");
        });

        it("excludes plaintext", () => {
            expect(availableLanguages).not.toContain(null);
        });

        it("contains only non-null language names", () => {
            for (const lang of availableLanguages) {
                expect(typeof lang).toBe("string");
                expect(lang.length).toBeGreaterThan(0);
            }
        });

        it("does not contain duplicates", () => {
            const unique = new Set(availableLanguages);
            expect(unique.size).toBe(availableLanguages.length);
        });
    });

    describe("languageAliases", () => {
        it("is a non-empty object", () => {
            expect(typeof languageAliases).toBe("object");
            expect(Object.keys(languageAliases).length).toBeGreaterThan(0);
        });

        it("includes common aliases", () => {
            expect(languageAliases["py"]).toBe("python");
            expect(languageAliases["javascript"]).toBe("javascript");
            expect(languageAliases["md"]).toBe("markdown");
            expect(languageAliases["sh"]).toBe("bash");
            expect(languageAliases["plaintext"]).toBeNull();
        });

        it("maps null for plaintext", () => {
            expect(languageAliases["plaintext"]).toBeNull();
        });
    });
});
