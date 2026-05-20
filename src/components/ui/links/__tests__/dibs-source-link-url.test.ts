import { describe, expect, test } from "vitest";
import { buildGitLabSourceUrl, resolveDibsProjectPath } from "../dibs-source-link-url";

describe("resolveDibsProjectPath", () => {
    test("falls back to the legacy DIBS namespace", () => {
        expect(resolveDibsProjectPath({ repo: "scripts" })).toBe("r8vnhill/dibs-scripts");
    });

    test("resolves the Python companion through the migration registry", () => {
        expect(resolveDibsProjectPath({ repo: "python-companion" })).toBe(
            "dibs-course/python-companion",
        );
    });

    test("resolves migrated repositories through the migration registry", () => {
        expect(resolveDibsProjectPath({ repo: "kotlin-companion" })).toBe(
            "dibs-course/kotlin-companion",
        );
    });

    test("prefers explicit projectPath overrides", () => {
        expect(resolveDibsProjectPath({
            repo: "kotlin-companion",
            projectPath: "custom/group",
        })).toBe("custom/group");
    });
});

describe("buildGitLabSourceUrl", () => {
    test("builds a legacy source URL with main as the default ref", () => {
        expect(buildGitLabSourceUrl({
            projectPath: "r8vnhill/dibs-scripts",
            file: "scripts/check.main.kts",
        }).href).toBe("https://gitlab.com/r8vnhill/dibs-scripts/-/blob/main/scripts/check.main.kts");
    });

    test("builds a migrated source URL with nested file paths", () => {
        expect(buildGitLabSourceUrl({
            projectPath: "dibs-course/kotlin-companion",
            file: "scripts/check-library-layout.main.kts",
        }).href).toBe(
            "https://gitlab.com/dibs-course/kotlin-companion/-/blob/main/scripts/check-library-layout.main.kts",
        );
    });

    test("uses a custom ref when provided", () => {
        expect(buildGitLabSourceUrl({
            projectPath: "r8vnhill/dibs-scripts",
            file: "scripts/check.main.kts",
            ref: "feature/source-links",
        }).href).toBe(
            "https://gitlab.com/r8vnhill/dibs-scripts/-/blob/feature/source-links/scripts/check.main.kts",
        );
    });

    test("preserves the existing single-line fragment format", () => {
        expect(buildGitLabSourceUrl({
            projectPath: "r8vnhill/dibs-scripts",
            file: "scripts/check.main.kts",
            line: 10,
        }).href).toBe("https://gitlab.com/r8vnhill/dibs-scripts/-/blob/main/scripts/check.main.kts#L10");
    });

    test("preserves the existing line-range fragment format", () => {
        expect(buildGitLabSourceUrl({
            projectPath: "r8vnhill/dibs-scripts",
            file: "scripts/check.main.kts",
            line: 10,
            endLine: 20,
        }).href).toBe("https://gitlab.com/r8vnhill/dibs-scripts/-/blob/main/scripts/check.main.kts#L10-20");
    });
});
