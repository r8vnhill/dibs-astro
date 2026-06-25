import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
    scanSvgDirectory,
    serializeInventory,
    runAudit,
} from "../audit-icons.mjs";

// One Piece-themed fixtures, isolated from the production allowlist.
const FIXTURE_CUSTOM_BASE_NAMES = ["baratie"];
const FIXTURE_FILES = {
    "baratie.svg": "<svg>baratie</svg>",
    "thousand-sunny.svg": "<svg>thousand-sunny</svg>",
    "water-seven.svg": "<svg>water-seven</svg>",
    "notes.txt": "not an icon",
};

async function withFixtureDir(fn) {
    const dir = await mkdtemp(join(tmpdir(), "audit-icons-"));
    try {
        for (const [name, contents] of Object.entries(FIXTURE_FILES)) {
            await writeFile(join(dir, name), contents);
        }
        return await fn(dir);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

describe("scanSvgDirectory", () => {
    it("includes only direct .svg entries given a directory with SVG and non-SVG entries", async () => {
        await withFixtureDir(async (dir) => {
            const files = await scanSvgDirectory(dir);
            assert.deepEqual(files, [
                "baratie.svg",
                "thousand-sunny.svg",
                "water-seven.svg",
            ]);
        });
    });
});

describe("serializeInventory", () => {
    it("produces byte-identical output for the same inventory across two calls", async () => {
        await withFixtureDir(async (dir) => {
            const files = await scanSvgDirectory(dir);
            const a = serializeInventory(files, FIXTURE_CUSTOM_BASE_NAMES);
            const b = serializeInventory(files, FIXTURE_CUSTOM_BASE_NAMES);
            assert.equal(a, b);
            assert.ok(a.endsWith("\n"));
            assert.equal(a.endsWith("\n\n"), false);
        });
    });
});

describe("runAudit --write", () => {
    it("writes byte-identical artifacts across two successive --write runs", async () => {
        await withFixtureDir(async (dir) => {
            const artifactPath = join(dir, "icon-inventory.json");

            const first = await runAudit({
                mode: "write",
                sourceDir: dir,
                artifactPath,
                customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
            });
            const firstBytes = await readFile(artifactPath, "utf8");

            const second = await runAudit({
                mode: "write",
                sourceDir: dir,
                artifactPath,
                customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
            });
            const secondBytes = await readFile(artifactPath, "utf8");

            assert.equal(firstBytes, secondBytes);
            assert.equal(first.ok, true);
            assert.equal(second.ok, true);
        });
    });
});

describe("runAudit --check", () => {
    it("succeeds without modifying files given an artifact that matches the current source", async () => {
        await withFixtureDir(async (dir) => {
            const artifactPath = join(dir, "icon-inventory.json");
            await runAudit({
                mode: "write",
                sourceDir: dir,
                artifactPath,
                customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
            });
            const before = await readFile(artifactPath, "utf8");

            const result = await runAudit({
                mode: "check",
                sourceDir: dir,
                artifactPath,
                customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
            });

            const after = await readFile(artifactPath, "utf8");
            assert.equal(result.ok, true);
            assert.equal(before, after);
        });
    });

    it("exits non-zero and explains that regeneration is required given a stale artifact", async () => {
        await withFixtureDir(async (dir) => {
            const artifactPath = join(dir, "icon-inventory.json");
            await runAudit({
                mode: "write",
                sourceDir: dir,
                artifactPath,
                customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
            });

            // Make the artifact stale by adding a new SVG after the artifact was written.
            await writeFile(
                join(dir, "going-merry.svg"),
                "<svg>going-merry</svg>",
            );

            const result = await runAudit({
                mode: "check",
                sourceDir: dir,
                artifactPath,
                customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
            });

            assert.equal(result.ok, false);
            assert.match(result.message, /regenerat/i);
        });
    });

    it("exits non-zero with a clear missing-artifact diagnostic given no committed artifact", async () => {
        await withFixtureDir(async (dir) => {
            const artifactPath = join(dir, "icon-inventory.json");

            const result = await runAudit({
                mode: "check",
                sourceDir: dir,
                artifactPath,
                customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
            });

            assert.equal(result.ok, false);
            assert.match(result.message, /missing/i);
        });
    });

    it("formats the summary as '<phosphor> phosphor + <custom> custom = <total> total'", async () => {
        await withFixtureDir(async (dir) => {
            const artifactPath = join(dir, "icon-inventory.json");
            const result = await runAudit({
                mode: "write",
                sourceDir: dir,
                artifactPath,
                customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
            });

            assert.equal(result.summary, "2 phosphor + 1 custom = 3 total");
        });
    });
});

describe("working-directory independence", () => {
    it("resolves the same source and destination paths regardless of process.cwd()", async () => {
        await withFixtureDir(async (dir) => {
            const artifactPath = join(dir, "icon-inventory.json");
            const originalCwd = process.cwd();
            try {
                process.chdir(tmpdir());
                const result = await runAudit({
                    mode: "write",
                    sourceDir: dir,
                    artifactPath,
                    customBaseNames: FIXTURE_CUSTOM_BASE_NAMES,
                });
                assert.equal(result.ok, true);
            } finally {
                process.chdir(originalCwd);
            }
        });
    });
});
