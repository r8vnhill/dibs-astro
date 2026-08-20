import { describe, expect, test } from "vitest";

import { extractGitlabProjectId, parseScopedRegistries, validateScopedRegistry } from "../../lib/package-resolution/registry.mjs";

const canonicalNpmrc = "@ravenhill:registry=https://gitlab.com/api/v4/projects/85449745/packages/npm/\n";
const staleNpmrc = "@ravenhill:registry=https://gitlab.com/api/v4/projects/85350050/packages/npm/\n";

describe("given .npmrc scoped-registry parsing", () => {
    test("then it extracts the declared scope registry", () => {
        expect(parseScopedRegistries(canonicalNpmrc).get("ravenhill")).toBe(
            "https://gitlab.com/api/v4/projects/85449745/packages/npm/",
        );
    });

    test("then it extracts the GitLab project id structurally", () => {
        expect(extractGitlabProjectId("https://gitlab.com/api/v4/projects/85449745/packages/npm/")).toBe("85449745");
    });

    test("then it does not extract a project id from an unrelated URL containing similar digits", () => {
        expect(extractGitlabProjectId("https://example.com/85449745/packages/npm/")).toBeUndefined();
    });
});

describe("given the canonical registry contract for project 85449745", () => {
    test("then the canonical .npmrc satisfies it", () => {
        expect(validateScopedRegistry(canonicalNpmrc, "ravenhill", "85449745").valid).toBe(true);
    });

    test("then the stale project 85350050 endpoint is rejected", () => {
        const result = validateScopedRegistry(staleNpmrc, "ravenhill", "85449745");
        expect(result.valid).toBe(false);
        expect(result.reason).toContain("85350050");
    });

    test("then a missing scope entry is rejected", () => {
        const result = validateScopedRegistry("", "ravenhill", "85449745");
        expect(result.valid).toBe(false);
    });
});
