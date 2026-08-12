// Imperative boundary: reads the on-disk release-policy inputs (the src/*.svg listing and the
// attribution manifest) and resolves them through the pure release-policy core. Shared by
// copy-assets.mjs and assert-pack-files.mjs so neither shell independently reinterprets the
// publication rules.

import { readdirSync, readFileSync } from "node:fs";

import { buildIconInventory } from "./icon-inventory.mjs";
import { CUSTOM_BASE_NAMES } from "./custom-base-names.mjs";
import { derivePublishableIcons } from "./release-policy.mjs";

/**
 * Renders release-policy findings as human-readable diagnostic lines.
 *
 * @param {{ code: string, file: string }[]} findings
 * @returns {string}
 */
export const formatReleasePolicyFindings = (findings) =>
    findings.map((finding) => `  - ${finding.code}: ${finding.file}`).join("\n");

/**
 * Resolves the current publishable icon plan from the on-disk source directory and attribution
 * manifest. Throws when the release policy reports unresolved findings, so callers never
 * silently copy or package an inconsistent asset set.
 *
 * @param {{ srcDir: string, manifestPath: string }} paths
 * @returns {{ file: string, exportName: string }[]}
 */
export function resolvePublishableIcons({ srcDir, manifestPath }) {
    const filenames = readdirSync(srcDir).filter((file) => file.endsWith(".svg"));
    const inventory = buildIconInventory(filenames, CUSTOM_BASE_NAMES);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    const { publishableIcons, findings } = derivePublishableIcons({ inventory, manifest });

    if (findings.length > 0) {
        throw new Error(
            `Release-policy findings block this operation:\n${formatReleasePolicyFindings(findings)}`,
        );
    }

    return publishableIcons;
}
