// Imperative boundary: reads the frozen, audited icon inventory (migration/icon-inventory.json)
// and the attribution manifest, and treats the live src/*.svg listing only as evidence of drift
// against that frozen record -- never as a source of classification. Resolves everything through
// the pure release-policy core. This is the single entry point shared by copy-assets.mjs,
// assert-pack-files.mjs, and generate-icons-index.js so none of them independently reinterprets
// or reconstructs the publication rules.

import { readdirSync, readFileSync } from "node:fs";

import { derivePublishableIcons, diffSourceAgainstInventory } from "./release-policy.mjs";

/**
 * Renders release-policy (or source-drift) findings as human-readable diagnostic lines.
 *
 * @param {{ code: string, file: string }[]} findings
 * @returns {string}
 */
export const formatReleasePolicyFindings = (findings) =>
    findings.map((finding) => `  - ${finding.code}: ${finding.file}`).join("\n");

const readJsonFile = (path) => JSON.parse(readFileSync(path, "utf8"));

const listSourceSvgFiles = (srcDir) =>
    readdirSync(srcDir).filter((file) => file.endsWith(".svg"));

const sortFindings = (findings) =>
    [...findings].sort((a, b) => a.code.localeCompare(b.code) || a.file.localeCompare(b.file));

/**
 * Resolves the full audited release plan: the frozen inventory and manifest are the
 * classification authority; the live source directory is consulted only to detect drift
 * (an inventory member missing from disk, or a source file untracked by the inventory).
 *
 * @param {{ inventoryPath: string, manifestPath: string, srcDir: string }} paths
 * @returns {{
 *   inventory: object,
 *   manifest: object,
 *   publishableIcons: { file: string, exportName: string }[],
 *   findings: { code: string, file: string }[],
 * }}
 */
export function resolveReleasePlan({ inventoryPath, manifestPath, srcDir }) {
    const inventory = readJsonFile(inventoryPath);
    const manifest = readJsonFile(manifestPath);
    const sourceFiles = listSourceSvgFiles(srcDir);
    const inventoryFiles = inventory.icons.map((icon) => icon.file);

    const driftFindings = diffSourceAgainstInventory({ inventoryFiles, sourceFiles });
    const { publishableIcons, findings: policyFindings } = derivePublishableIcons({
        inventory,
        manifest,
    });

    return {
        inventory,
        manifest,
        publishableIcons,
        findings: sortFindings([...driftFindings, ...policyFindings]),
    };
}

/**
 * Resolves the current publishable icon plan from the frozen inventory, attribution manifest,
 * and source-directory drift check. Throws when release policy or source/inventory drift reports
 * unresolved findings, so callers never silently copy, package, or generate exports for an
 * inconsistent asset set.
 *
 * @param {{ inventoryPath: string, manifestPath: string, srcDir: string }} paths
 * @returns {{ file: string, exportName: string }[]}
 */
export function resolvePublishableIcons({ inventoryPath, manifestPath, srcDir }) {
    const { publishableIcons, findings } = resolveReleasePlan({
        inventoryPath,
        manifestPath,
        srcDir,
    });

    if (findings.length > 0) {
        throw new Error(
            `Release-policy findings block this operation:\n${formatReleasePolicyFindings(findings)}`,
        );
    }

    return publishableIcons;
}
