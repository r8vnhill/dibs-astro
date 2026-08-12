import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { resolvePublishableIcons, resolveReleasePlan } from "../lib/publishable-plan.mjs";
import { RELEASE_POLICY_FINDING_CODES } from "../lib/release-policy.mjs";

// Sanderson-themed fixture names only; never the real 1,521-icon production inventory.
const buildInventory = (icons) => ({ icons });
const buildManifest = (assets = []) => ({ assets });

describe("Feature: the frozen inventory is the publication authority", () => {
    let workDir;
    let srcDir;

    before(async () => {
        workDir = await mkdtemp(join(tmpdir(), "astro-icons-publishable-plan-"));
        srcDir = join(workDir, "src");
        await mkdir(srcDir, { recursive: true });
    });

    after(async () => {
        await rm(workDir, { recursive: true, force: true });
    });

    async function writeFixture({ inventory, manifest, sourceFiles }) {
        const inventoryPath = join(workDir, "icon-inventory.json");
        const manifestPath = join(workDir, "third-party-icons.json");
        await writeFile(inventoryPath, JSON.stringify(inventory));
        await writeFile(manifestPath, JSON.stringify(manifest));
        await rm(srcDir, { recursive: true, force: true });
        await mkdir(srcDir, { recursive: true });
        for (const file of sourceFiles) {
            await writeFile(join(srcDir, file), `<svg><!-- ${file} --></svg>`);
        }
        return { inventoryPath, manifestPath, srcDir };
    }

    test("Scenario: an unreviewed source SVG cannot become publishable", async () => {
        const paths = await writeFixture({
            inventory: buildInventory([{ file: "roshar.svg", exportName: "Roshar", group: "phosphor" }]),
            manifest: buildManifest(),
            sourceFiles: ["roshar.svg", "worldhopper.svg"],
        });

        const { findings, publishableIcons } = resolveReleasePlan(paths);

        assert.ok(
            findings.some((finding) =>
                finding.code === RELEASE_POLICY_FINDING_CODES.UNTRACKED_SOURCE &&
                finding.file === "worldhopper.svg"
            ),
        );
        assert.deepEqual(publishableIcons.map((icon) => icon.file), ["roshar.svg"]);
        assert.throws(() => resolvePublishableIcons(paths), /worldhopper\.svg/u);
    });

    test("Scenario: a frozen inventory member must still exist in source", async () => {
        const paths = await writeFixture({
            inventory: buildInventory([{ file: "roshar.svg", exportName: "Roshar", group: "phosphor" }]),
            manifest: buildManifest(),
            sourceFiles: [],
        });

        const { findings } = resolveReleasePlan(paths);

        assert.ok(
            findings.some((finding) =>
                finding.code === RELEASE_POLICY_FINDING_CODES.MISSING_SOURCE &&
                finding.file === "roshar.svg"
            ),
        );
        assert.throws(() => resolvePublishableIcons(paths), /roshar\.svg/u);
    });

    test("Scenario: valid inventory/source/manifest state resolves without findings", async () => {
        const paths = await writeFixture({
            inventory: buildInventory([
                { file: "roshar.svg", exportName: "Roshar", group: "phosphor" },
                { file: "bash.svg", exportName: "Bash", group: "custom" },
            ]),
            manifest: buildManifest([
                {
                    file: "bash.svg",
                    releaseDecision: { action: "include" },
                    redistribution: { conclusion: "permitted" },
                },
            ]),
            sourceFiles: ["roshar.svg", "bash.svg"],
        });

        const publishableIcons = resolvePublishableIcons(paths);

        assert.deepEqual(
            publishableIcons.map((icon) => icon.file).sort(),
            ["bash.svg", "roshar.svg"],
        );
    });
});
