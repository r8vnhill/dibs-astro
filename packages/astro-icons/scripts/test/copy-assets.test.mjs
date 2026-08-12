import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { copyFiles } from "../copy-assets.mjs";

describe("Feature: publishable SVG copying", () => {
    let workDir;
    let sourceDirectory;
    let destinationDirectory;

    before(async () => {
        workDir = await mkdtemp(join(tmpdir(), "astro-icons-copy-assets-"));
        sourceDirectory = join(workDir, "src");
        destinationDirectory = join(workDir, "dist");
        await mkdir(sourceDirectory, { recursive: true });
        await writeFile(join(sourceDirectory, "acorn.svg"), "<svg><!-- acorn --></svg>");
        await writeFile(join(sourceDirectory, "bash.svg"), "<svg><!-- bash --></svg>");
    });

    after(async () => {
        await rm(workDir, { recursive: true, force: true });
    });

    test("Scenario: release-approved assets are copied", async () => {
        await copyFiles({ files: ["acorn.svg"], sourceDirectory, destinationDirectory });

        assert.ok(existsSync(join(destinationDirectory, "acorn.svg")));
    });

    test("Scenario: excluded assets are not copied", async () => {
        await copyFiles({ files: ["acorn.svg"], sourceDirectory, destinationDirectory });

        assert.equal(existsSync(join(destinationDirectory, "bash.svg")), false);
    });

    test("copies exactly the given file collection, creating the destination directory", async () => {
        const isolatedDestination = join(workDir, "dist-isolated");

        const count = await copyFiles({
            files: ["acorn.svg", "bash.svg"],
            sourceDirectory,
            destinationDirectory: isolatedDestination,
        });

        assert.equal(count, 2);
        assert.ok(existsSync(join(isolatedDestination, "acorn.svg")));
        assert.ok(existsSync(join(isolatedDestination, "bash.svg")));
    });
});
