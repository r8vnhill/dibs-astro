#!/usr/bin/env node

/**
 * Validates that the package tarball contains only intended distributable files.
 *
 * This script ensures:
 * - Required files are included: dist/index.js, dist/index.d.ts, README.md, package.json
 * - Source files are excluded: src/**, tests/**, scripts/**, vitest.config.*, tsup.config.*
 * - Package metadata is correct: name, version, type: "module", exports, main, types, files
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const packageJsonPath = join(packageRoot, "package.json");

function normalizePath(filePath) {
    // Convert Windows backslashes to forward slashes for consistent comparison
    return filePath.replace(/\\/g, "/");
}

try {
    // Parse package.json
    const packageJsonContent = readFileSync(packageJsonPath, "utf8");
    const pkgMetadata = JSON.parse(packageJsonContent);

    console.log(`📦 Validating pack from package root: ${packageRoot}`);
    console.log(`   Package: ${pkgMetadata.name}@${pkgMetadata.version}\n`);

    // Run pnpm pack --dry-run --json to get structured output
    const output = execSync("pnpm pack --dry-run --json", {
        cwd: packageRoot,
        encoding: "utf8",
    });

    let packedFiles = [];
    try {
        const jsonOutput = JSON.parse(output);
        packedFiles = Array.isArray(jsonOutput) ? jsonOutput : [jsonOutput];
        if (
            packedFiles.length > 0 &&
            packedFiles[0].filename
        ) {
            // Extract the files array from the pack result
            packedFiles = packedFiles[0].files || [];
        }
    } catch {
        // Fallback if JSON parsing fails: try text parsing
        packedFiles = output
            .split("\n")
            .filter(line => line.trim() && !line.includes("Building"))
            .map(line => ({
                path: line.trim(),
            }));
    }

    const packedFilePaths = packedFiles.map(f => normalizePath(f.path || f));

    // Define expected and forbidden files
    const requiredFiles = [
        "package.json",
        "README.md",
        "dist/index.js",
        "dist/index.d.ts",
    ];

    const forbiddenPatterns = [
        /^src\//,
        /^tests?\//,
        /^scripts\//,
        /^vitest\.config\./,
        /^tsup\.config\./,
        /^\.git/,
        /^node_modules\//,
        /\.tgz$/,
    ];

    let hasErrors = false;

    // Check required files
    console.log("Checking required files:");
    for (const requiredFile of requiredFiles) {
        const found = packedFilePaths.some(p => p.endsWith(requiredFile) || p === requiredFile);
        if (found) {
            console.log(`  ✅ ${requiredFile}`);
        } else {
            console.error(`  ❌ Missing: ${requiredFile}`);
            hasErrors = true;
        }
    }

    // Check for forbidden files
    console.log("\nChecking for excluded files:");
    for (const filePath of packedFilePaths) {
        const isForbidden = forbiddenPatterns.some(pattern => pattern.test(filePath));
        if (isForbidden) {
            console.error(`  ❌ Should not be included: ${filePath}`);
            hasErrors = true;
        }
    }

    // Validate package metadata
    console.log("\nValidating package metadata:");
    const metadataChecks = [
        {
            name: "name",
            condition: pkgMetadata.name === "@ravenhill/shiki-core",
            value: pkgMetadata.name,
        },
        {
            name: "version",
            condition: pkgMetadata.version && pkgMetadata.version.match(/^\d+\.\d+\.\d+/),
            value: pkgMetadata.version,
        },
        {
            name: 'type: "module"',
            condition: pkgMetadata.type === "module",
            value: pkgMetadata.type,
        },
        {
            name: "main",
            condition: pkgMetadata.main === "./dist/index.js",
            value: pkgMetadata.main,
        },
        {
            name: "types",
            condition: pkgMetadata.types === "./dist/index.d.ts",
            value: pkgMetadata.types,
        },
        {
            name: "exports (root only)",
            condition:
                pkgMetadata.exports &&
                pkgMetadata.exports["."] &&
                !Object.keys(pkgMetadata.exports).some(key => key !== "."),
            value: Object.keys(pkgMetadata.exports || {}),
        },
        {
            name: "files",
            condition:
                Array.isArray(pkgMetadata.files) &&
                pkgMetadata.files.includes("dist") &&
                pkgMetadata.files.includes("README.md"),
            value: pkgMetadata.files,
        },
    ];

    for (const check of metadataChecks) {
        if (check.condition) {
            console.log(`  ✅ ${check.name}: ${JSON.stringify(check.value)}`);
        } else {
            console.error(`  ❌ ${check.name}: ${JSON.stringify(check.value)}`);
            hasErrors = true;
        }
    }

    if (!hasErrors) {
        console.log("\n✅ Pack validation passed");
        process.exit(0);
    } else {
        console.error("\n❌ Pack validation failed");
        process.exit(1);
    }
} catch (error) {
    console.error("❌ Pack check failed:", error instanceof Error ? error.message : error);
    process.exit(1);
}
