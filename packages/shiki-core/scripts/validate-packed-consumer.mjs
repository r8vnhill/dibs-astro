#!/usr/bin/env node

/**
 * Validates the package from an external consumer perspective.
 *
 * This script:
 * 1. Builds the package
 * 2. Creates a temporary directory outside the workspace
 * 3. Packs the package to a temp tarball directory
 * 4. Creates a clean consumer project
 * 5. Installs the package from the generated tarball
 * 6. Validates that root imports work at runtime (ESM)
 * 7. Validates that TypeScript declarations can be imported
 * 8. Validates that internal subpaths are blocked
 * 9. Cleans up temp directories
 */

import { execSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");

const shouldKeepTemp = process.env.SHIKI_CORE_KEEP_CONSUMER_TEMP === "1";
const tempRoot = mkdtempSync(join(tmpdir(), "shiki-core-consumer-"));
const tarbalsDir = join(tempRoot, "tarballs");
const consumerDir = join(tempRoot, "consumer");

console.log(`🧪 Testing external consumer validation`);
console.log(`   Temp root: ${tempRoot}`);
if (shouldKeepTemp) {
    console.log(`   ⚠️  Debug mode enabled: temp directory will be kept\n`);
} else {
    console.log();
}

try {
    // Step 1: Build the package
    console.log("1️⃣  Building package...");
    execSync("pnpm run build", { cwd: packageRoot, stdio: "inherit" });

    // Step 2: Create tarball in temp directory with JSON output
    console.log("\n2️⃣  Creating tarball in temp directory...");
    mkdirSync(tarbalsDir, { recursive: true });
    
    const packOutput = execSync(
        `pnpm pack --pack-destination "${tarbalsDir}" --json`,
        {
            cwd: packageRoot,
            encoding: "utf8",
        },
    );

    let tarballPath;
    try {
        const packResult = JSON.parse(packOutput);
        let tarballFileName = packResult.filename || packResult[0]?.filename;
        
        if (!tarballFileName) {
            throw new Error("Could not determine tarball filename from pack output");
        }
        
        // pnpm may return the full path, so we just want the filename
        if (tarballFileName.includes("\\") || tarballFileName.includes("/")) {
            tarballFileName = tarballFileName.split(/[/\\]/).pop();
        }
        
        tarballPath = join(tarbalsDir, tarballFileName);
    } catch (parseError) {
        throw new Error(
            `Failed to parse pack output: ${parseError instanceof Error ? parseError.message : parseError}`,
        );
    }

    console.log(`   Tarball created: ${tarballPath}`);

    // Step 3: Initialize temporary consumer project
    console.log("\n3️⃣  Initializing temporary consumer project...");
    mkdirSync(consumerDir, { recursive: true });
    writeFileSync(
        join(consumerDir, "package.json"),
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
    console.log("4️⃣  Installing package from tarball...");
    execSync(`pnpm install "${tarballPath}"`, {
        cwd: consumerDir,
        stdio: "inherit",
    });

    // Step 5: Install TypeScript for type validation
    console.log("\n5️⃣  Installing TypeScript for type validation...");
    execSync("pnpm install -D typescript@latest", {
        cwd: consumerDir,
        stdio: "inherit",
    });

    // Step 6: Test runtime ESM import
    console.log("\n6️⃣  Testing runtime ESM import...");
    const runtimeProbe = `import { createShikiHighlighterService, resolveShikiLanguage } from "@ravenhill/shiki-core";

const service = createShikiHighlighterService();

if (typeof service !== "object") {
    throw new Error("Expected createShikiHighlighterService() to return an object.");
}

const result = resolveShikiLanguage("typescript");
if (!result.resolvedLang) {
    throw new Error("Expected resolveShikiLanguage('typescript') to return a resolved language.");
}

console.log("✅ Runtime ESM import works");
console.log("   Service type:", typeof service);
console.log("   Language resolution: " + result.resolvedLang);
`;

    writeFileSync(join(consumerDir, "test-runtime.mjs"), runtimeProbe);
    execSync("node test-runtime.mjs", { cwd: consumerDir, stdio: "inherit" });

    // Step 7: Test TypeScript declaration import
    console.log("\n7️⃣  Testing TypeScript declaration import...");
    const typeProbe = `import {
    createShikiHighlighterService,
    resolveShikiLanguage,
    type ShikiHighlighterService,
} from "@ravenhill/shiki-core";

const service: ShikiHighlighterService = createShikiHighlighterService();
const result = resolveShikiLanguage("ts");
const language: string | null = result.resolvedLang;

void service;
void language;

console.log("✅ TypeScript declarations import successfully");
`;

    mkdirSync(join(consumerDir, "src"), { recursive: true });
    writeFileSync(join(consumerDir, "src", "typecheck.ts"), typeProbe);

    const tsconfigContent = {
        compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM"],
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
        },
        include: ["src/**/*.ts"],
    };

    writeFileSync(
        join(consumerDir, "tsconfig.json"),
        JSON.stringify(tsconfigContent, null, 2),
    );

    execSync("pnpm exec tsc --noEmit", { cwd: consumerDir, stdio: "inherit" });

    // Step 8: Test internal subpath blocking
    console.log("\n8️⃣  Testing internal subpath blocking...");
    const blockedSubpaths = [
        "@ravenhill/shiki-core/src",
        "@ravenhill/shiki-core/src/index",
        "@ravenhill/shiki-core/dist",
        "@ravenhill/shiki-core/dist/index",
        "@ravenhill/shiki-core/internal",
        "@ravenhill/shiki-core/languages",
        "@ravenhill/shiki-core/transformers",
    ];

    let anySubpathSucceeded = false;
    for (const subpath of blockedSubpaths) {
        try {
            const testCode = `import "${subpath}"; console.log("ERROR: subpath import succeeded");`;
            writeFileSync(join(consumerDir, "test-subpath.mjs"), testCode);
            execSync("node test-subpath.mjs", {
                cwd: consumerDir,
                stdio: "pipe",
                timeout: 5000,
            });
            console.log(`   ❌ Subpath ${subpath} was NOT blocked (should have failed)`);
            anySubpathSucceeded = true;
        } catch {
            // Expected: subpath should fail
            console.log(`   ✅ Subpath ${subpath} correctly blocked`);
        }
    }

    if (anySubpathSucceeded) {
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
    if (!shouldKeepTemp) {
        try {
            rmSync(tempRoot, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    } else {
        console.log(`\n💾 Debug mode: temp directory retained at ${tempRoot}`);
    }
}
