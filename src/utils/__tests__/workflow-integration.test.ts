/**
 * @file workflow-integration.test.ts
 *
 * Workflow wiring tests for lesson metadata generation.
 *
 * This suite validates that the repository is configured to generate lesson metadata automatically
 * as part of the main developer workflows (dev/build/deploy).
 *
 * ## What this protects
 *
 * - The `generate:lesson-metadata` script remains present and points to the expected entrypoint.
 * - The `predev`, `prebuild`, and `predeploy` hooks call the generator, ensuring metadata is
 *   regenerated consistently.
 * - The generator entrypoint file exists on disk.
 *
 * ## Why an “integration” test?
 *
 * These checks are not about the generator's business logic (which should be unit-tested
 * separately). Instead, this test guards the *project contract* that makes the workflow reliable
 * across:
 *
 * - Local development
 * - CI pipelines
 * - Deploy steps
 *
 * It intentionally reads `package.json` from the repository root rather than importing build
 * configuration, since the goal is to verify the real shipped configuration.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

/**
 * Minimal view of `package.json` for this test.
 *
 * We only care about `scripts`. Everything else is irrelevant here.
 */
interface PackageJson {
    scripts?: Record<string, unknown>;
}

/**
 * Error thrown when the test cannot locate the repository root.
 */
class RepoRootNotFoundError extends Error {
    constructor(startDir: string) {
        super(
            `Could not locate package.json while walking parent directories from "${startDir}".`,
        );
        this.name = "RepoRootNotFoundError";
    }
}

/**
 * Error thrown when `package.json` does not expose a valid `scripts` object.
 */
class PackageScriptsMissingError extends Error {
    constructor() {
        super("package.json must include a scripts object.");
        this.name = "PackageScriptsMissingError";
    }
}

/**
 * Finds the repository root directory by walking upwards until a `package.json` is found.
 *
 * This is more robust than relying on `process.cwd()` because Vitest may run tests from:
 * - an IDE
 * - a subfolder
 * - a monorepo workspace
 *
 * The search is bounded (max 25 parent directories) to avoid accidental infinite loops.
 *
 * @param startDir Directory from which to begin the upward search.
 * @returns Absolute path to the repository root.
 * @throws {RepoRootNotFoundError} If no `package.json` can be located within the search limit.
 */
function findRepoRoot(startDir: string): string {
    let current = startDir;

    for (let index = 0; index < 25; index += 1) {
        const packageJsonPath = resolve(current, "package.json");
        if (existsSync(packageJsonPath)) return current;

        const parent = resolve(current, "..");
        if (parent === current) break;
        current = parent;
    }

    throw new RepoRootNotFoundError(startDir);
}

/**
 * Reads and parses the repository `package.json`.
 *
 * @param repoRoot Absolute path to the repository root.
 * @returns Parsed `package.json` object (minimal shape).
 * @throws {Error} If the file cannot be read or the JSON is invalid.
 */
function readPackageJson(repoRoot: string): PackageJson {
    const packageJsonPath = resolve(repoRoot, "package.json");
    const raw = readFileSync(packageJsonPath, "utf-8");
    return JSON.parse(raw) as PackageJson;
}

/**
 * Extracts and type-narrows the `scripts` section.
 *
 * `package.json` allows arbitrary values; this function filters the scripts object to only include
 * string-valued entries (the only valid type for script commands).
 *
 * This keeps the test strict and avoids accidental failures due to unexpected types.
 *
 * @param packageJson Parsed `package.json` object.
 * @returns A record of script names to command strings.
 * @throws {Error} If `scripts` is missing or is not an object.
 */
function readScripts(packageJson: PackageJson): Record<string, string> {
    const scripts = packageJson.scripts;
    if (!scripts || typeof scripts !== "object") {
        throw new PackageScriptsMissingError();
    }

    const entries = Object.entries(scripts).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
    );

    return Object.fromEntries(entries);
}

describe("lesson metadata workflow integration", () => {
    test("defines generation script and pre hooks for dev/build/deploy", () => {
        // Start from the test file location and walk up to repo root.
        const here = dirname(fileURLToPath(import.meta.url));
        const repoRoot = findRepoRoot(here);

        const packageJson = readPackageJson(repoRoot);
        const scripts = readScripts(packageJson);

        // The generator entrypoint should remain stable.
        expect(scripts["generate:lesson-metadata"]).toContain(
            "scripts/generate-lesson-metadata.mjs",
        );

        // Hooks ensure regeneration happens automatically for the major workflows.
        for (const hook of ["predev", "prebuild", "predeploy"] as const) {
            expect(scripts[hook]).toBeDefined();
            expect(scripts[hook]).toContain("generate:lesson-metadata");
        }

        // Ensure the script referenced by package.json actually exists.
        expect(
            existsSync(resolve(repoRoot, "scripts/generate-lesson-metadata.mjs")),
        ).toBe(true);
    });
});
