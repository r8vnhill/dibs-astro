/**
 * @file shiki-import-boundary.test.ts
 *
 * Enforces Phase 6 final state and test module boundaries.
 *
 * This suite verifies that:
 * - No source or config code imports from ~/lib/shiki (deprecated bridge)
 * - No source or config code imports from src/lib/shiki
 * - No imports use @ravenhill/shiki-core subpaths (only root)
 * - Production code does not import test-only modules (*.testing.ts)
 * - App highlighting code uses only:
 *   - @ravenhill/shiki-core (reusable package APIs)
 *   - ~/lib/code-highlighting (app-local Shiki service boundary)
 * - UI rendering code stays in src/components/ui/code
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Simple regex-based scanner to find forbidden imports in a file.
 * Returns array of { lineNum, content, type } or empty if none found.
 */
function scanFile(
    filePath: string,
): Array<{ lineNum: number; content: string; type: string }> {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const findings: Array<{ lineNum: number; content: string; type: string }> =
        [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Deprecated bridge imports
        if (/from\s+["']~\/lib\/shiki/.test(line)) {
            findings.push({
                lineNum,
                content: line.trim(),
                type: "deprecated-tilde-shiki",
            });
        }
        if (/from\s+["']\.\..*lib\/shiki/.test(line)) {
            findings.push({
                lineNum,
                content: line.trim(),
                type: "deprecated-relative-shiki",
            });
        }

        // Subpath imports of the package
        if (/@ravenhill\/shiki-core\/[^"]/.test(line)) {
            findings.push({
                lineNum,
                content: line.trim(),
                type: "package-subpath",
            });
        }

        // Production code importing test-only modules
        if (/from\s+["'][^"']*\.testing["']/.test(line)) {
            findings.push({
                lineNum,
                content: line.trim(),
                type: "test-module-import",
            });
        }
    }

    return findings;
}

/**
 * Recursively walk a directory and collect all .ts/.tsx files (excluding node_modules and dist).
 */
function walkDir(
    dir: string,
    results: string[] = [],
    exclude: Set<string> = new Set([
        "node_modules",
        ".git",
        "dist",
        "build",
        ".astro",
    ]),
): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (exclude.has(file)) continue;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, results, exclude);
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            results.push(filePath);
        }
    }
    return results;
}

/**
 * Check if a file is a test file (safe to import test-only modules).
 */
function isTestFile(filePath: string): boolean {
    return /\.(test|spec)\.ts(x?)$/.test(filePath) || filePath.includes("/tests/");
}

describe("Phase 6: Shiki import boundaries", () => {
    const root = path.resolve(__dirname, "../..");

    it("should not import from deprecated ~/lib/shiki in src/ code", () => {
        const srcDir = path.join(root, "src");
        const files = walkDir(srcDir);
        const findings: Array<{
            file: string;
            lineNum: number;
            content: string;
        }> = [];

        for (const file of files) {
            const issues = scanFile(file);
            for (const issue of issues) {
                if (issue.type === "deprecated-tilde-shiki") {
                    findings.push({
                        file: path.relative(root, file),
                        lineNum: issue.lineNum,
                        content: issue.content,
                    });
                }
            }
        }

        expect(findings, {
            message: `Found imports from deprecated ~/lib/shiki:\n${findings.map((f) => `  ${f.file}:${f.lineNum}: ${f.content}`).join("\n")}`,
        }).toHaveLength(0);
    });

    it("should not import from deprecated src/lib/shiki in src/ code", () => {
        const srcDir = path.join(root, "src");
        const files = walkDir(srcDir);
        const findings: Array<{
            file: string;
            lineNum: number;
            content: string;
        }> = [];

        for (const file of files) {
            const issues = scanFile(file);
            for (const issue of issues) {
                if (issue.type === "deprecated-relative-shiki") {
                    findings.push({
                        file: path.relative(root, file),
                        lineNum: issue.lineNum,
                        content: issue.content,
                    });
                }
            }
        }

        expect(findings, {
            message: `Found imports from deprecated src/lib/shiki:\n${findings.map((f) => `  ${f.file}:${f.lineNum}: ${f.content}`).join("\n")}`,
        }).toHaveLength(0);
    });

    it("should not import from @ravenhill/shiki-core subpaths", () => {
        const dirs = ["src", "config", "packages"];
        const findings: Array<{
            file: string;
            lineNum: number;
            content: string;
        }> = [];

        for (const dirName of dirs) {
            const dir = path.join(root, dirName);
            if (!fs.existsSync(dir)) continue;
            const files = walkDir(dir);

            for (const file of files) {
                const issues = scanFile(file);
                for (const issue of issues) {
                    if (issue.type === "package-subpath") {
                        findings.push({
                            file: path.relative(root, file),
                            lineNum: issue.lineNum,
                            content: issue.content,
                        });
                    }
                }
            }
        }

        expect(findings, {
            message: `Found @ravenhill/shiki-core subpath imports:\n${findings.map((f) => `  ${f.file}:${f.lineNum}: ${f.content}`).join("\n")}`,
        }).toHaveLength(0);
    });

    it("should not have src/lib/shiki directory", () => {
        const shikiDir = path.join(root, "src/lib/shiki");
        expect(fs.existsSync(shikiDir), {
            message: `Found deprecated src/lib/shiki directory. Phase 6 should have removed it.`,
        }).toBe(false);
    });

    it("should not import test-only modules in production code", () => {
        const dirs = ["src/application", "src/domain", "src/infrastructure", "src/presentation", "config"];
        const findings: Array<{
            file: string;
            lineNum: number;
            content: string;
        }> = [];

        for (const dirName of dirs) {
            const dir = path.join(root, dirName);
            if (!fs.existsSync(dir)) continue;
            const files = walkDir(dir);

            for (const file of files) {
                // Skip test files; they are allowed to import .testing modules
                if (isTestFile(file)) continue;

                const issues = scanFile(file);
                for (const issue of issues) {
                    if (issue.type === "test-module-import") {
                        findings.push({
                            file: path.relative(root, file),
                            lineNum: issue.lineNum,
                            content: issue.content,
                        });
                    }
                }
            }
        }

        expect(findings, {
            message: `Found production code importing test-only (.testing) modules:\n${findings.map((f) => `  ${f.file}:${f.lineNum}: ${f.content}`).join("\n")}`,
        }).toHaveLength(0);
    });
});

