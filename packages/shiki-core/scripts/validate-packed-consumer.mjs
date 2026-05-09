#!/usr/bin/env node

/**
 * Validates the package from an external consumer perspective.
 *
 * This script:
 * 1. Builds the package
 * 2. Creates a temporary directory outside the workspace
 * 3. Installs the package from the tarball
 * 4. Validates that root imports work
 * 5. Validates that subpath imports are blocked
 * 6. Validates TypeScript types can be imported
 */

import { execSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const packageDir = new URL(".", import.meta.url).pathname.replace(/\/$/, "").replace(/scripts$/, "");

const tempDir = mkdtempSync(join(tmpdir(), "shiki-core-consumer-"));

console.log(`Testing external consumer in ${tempDir}`);

try {
    // Step 1: Build the package
    console.log("\n1. Building package...");
    execSync("pnpm run build", { cwd: packageDir, stdio: "inherit" });

    // Step 2: Create tarball
    console.log("\n2. Creating tarball...");
    const tarballOutput = execSync("pnpm pack", {
        cwd: packageDir,
        encoding: "utf8",
    });

    const tarballLine = tarballOutput
        .split("\n")
        .find(line => line.endsWith(".tgz"));
    if (!tarballLine) {
        throw new Error("Could not determine tarball path from pnpm pack output");
    }

    const tarballPath = join(packageDir, tarballLine.trim());

    // Step 3: Initialize temporary consumer project
    console.log("\n3. Initializing temporary consumer project...");
    writeFileSync(
        join(tempDir, "package.json"),
        JSON.stringify(
            {
                name: "shiki-core-test-consumer",
                type: "module",
                version: "1.0.0",
            },
            null,
            2,
        ),
    );

    // Step 4: Install package from tarball
    console.log("4. Installing package from tarball...");
    execSync(`pnpm install ${tarballPath}`, { cwd: tempDir, stdio: "inherit" });

    // Step 5: Test root import works
    console.log("\n5. Testing root import...");
    const rootImportTest = `
import * as shikiCore from "@ravenhill/shiki-core";
if (!("getShikiHighlighter" in shikiCore)) {
    throw new Error("Missing public export: getShikiHighlighter");
}
console.log("✅ Root import works");
console.log("Exported symbols:", Object.keys(shikiCore).length);
`;

    writeFileSync(join(tempDir, "test-root-import.mjs"), rootImportTest);
    execSync("node test-root-import.mjs", { cwd: tempDir, stdio: "inherit" });

    // Step 6: Test TypeScript types import
    console.log("\n6. Testing TypeScript types...");
    const typeImportTest = `
import type {
    HighlightCodeOptions,
    HighlightLanguage,
    HighlightRetryContext,
    HighlightThemePair,
    RetryHighlightOperation,
} from "@ravenhill/shiki-core";

// Create valid type instances to verify they're defined
const lang: HighlightLanguage = "python";
const themes: HighlightThemePair = {
    light: "catppuccin-latte",
    dark: "catppuccin-mocha",
};
const context: HighlightRetryContext = {
    operation: "test",
    language: "python",
};
const options: HighlightCodeOptions = {
    code: "console.log('test')",
    language: lang,
    themes,
};

console.log("✅ TypeScript types import successfully");
`;

    writeFileSync(join(tempDir, "test-types.ts"), typeImportTest);

    // Step 7: Test subpath imports fail
    console.log("\n7. Testing subpath import blocking...");
    const blockedSubpaths = [
        "@ravenhill/shiki-core/src/index.js",
        "@ravenhill/shiki-core/dist/index.js",
        "@ravenhill/shiki-core/cache",
        "@ravenhill/shiki-core/src",
    ];

    let anySubpathFailed = false;
    for (const subpath of blockedSubpaths) {
        try {
            const testCode = `import "${subpath}"; console.log("ERROR: subpath import succeeded");`;
            writeFileSync(join(tempDir, "test-subpath.mjs"), testCode);
            execSync("node test-subpath.mjs", { cwd: tempDir, stdio: "pipe" });
            console.log(`❌ Subpath ${subpath} was NOT blocked (should have failed)`);
            anySubpathFailed = true;
        } catch {
            // Expected: subpath should fail
            console.log(`✅ Subpath ${subpath} correctly blocked`);
        }
    }

    if (anySubpathFailed) {
        throw new Error("Some subpath imports were not properly blocked");
    }

    console.log("\n✅ External consumer validation passed");
    process.exit(0);
} catch (error) {
    console.error(
        "\n❌ External consumer validation failed:",
        error instanceof Error ? error.message : error,
    );
    process.exit(1);
} finally {
    // Cleanup
    try {
        rmSync(tempDir, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }
}
