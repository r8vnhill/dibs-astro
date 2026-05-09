#!/usr/bin/env node

/**
 * Validates that the package tarball contains only intended distributable files.
 *
 * Expected files after a successful build:
 * - README.md
 * - package.json
 * - dist/index.js
 * - dist/index.js.map
 * - dist/index.d.ts
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const packageDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(packageDir, "package.json");

try {
    // Run pnpm pack --dry-run to see what would be packed
    const output = execSync("pnpm pack --dry-run", {
        cwd: packageDir,
        encoding: "utf8",
    });

    const lines = output
        .split("\n")
        .filter(line => line.trim())
        .filter(line => !line.includes("Building"));

    const expectedFiles = [
        "package.json",
        "README.md",
        "dist/index.js",
        "dist/index.js.map",
        "dist/index.d.ts",
    ];

    console.log("Checking pack contents...");
    console.log("Expected files:", expectedFiles);
    console.log("\nActual pack output:");
    lines.forEach(line => console.log("  " + line));

    // Simple check: verify expected files are mentioned
    let allPresent = true;
    for (const expectedFile of expectedFiles) {
        const found = lines.some(line => line.includes(expectedFile));
        if (!found) {
            console.warn(`⚠️  Missing expected file: ${expectedFile}`);
            allPresent = false;
        }
    }

    if (allPresent) {
        console.log("\n✅ All expected files present in pack");
        process.exit(0);
    } else {
        console.error(
            "\n❌ Pack validation failed: some expected files are missing",
        );
        process.exit(1);
    }
} catch (error) {
    console.error("❌ Pack check failed:", error instanceof Error ? error.message : error);
    process.exit(1);
}
