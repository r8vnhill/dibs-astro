// Imperative shell: copies only release-policy-approved SVG assets from src/ to dist/. The
// eligibility decision itself belongs to the pure release-policy core (scripts/lib/release-policy.mjs);
// this script receives an already-derived publishable file collection and copies exactly that.

import { cp, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePublishableIcons } from "./lib/publishable-plan.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(packageRoot, "src");
const distDir = resolve(packageRoot, "dist");
const manifestPath = resolve(packageRoot, "LICENSES", "third-party-icons.json");
const inventoryPath = resolve(packageRoot, "migration", "icon-inventory.json");

/**
 * Copies a fixed file collection from one directory to another, creating the destination
 * directory if needed.
 *
 * @param {{ files: string[], sourceDirectory: string, destinationDirectory: string }} options
 * @returns {Promise<number>}
 */
export async function copyFiles({ files, sourceDirectory, destinationDirectory }) {
    await mkdir(destinationDirectory, { recursive: true });
    await Promise.all(
        files.map((file) => cp(resolve(sourceDirectory, file), resolve(destinationDirectory, file))),
    );
    return files.length;
}

async function main() {
    const publishableIcons = resolvePublishableIcons({ srcDir, manifestPath, inventoryPath });
    const files = publishableIcons.map((icon) => icon.file);

    const count = await copyFiles({
        files,
        sourceDirectory: srcDir,
        destinationDirectory: distDir,
    });

    console.log(`✓ Copied ${count} publishable SVG files from src/ to dist/.`);
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
    await main();
}
