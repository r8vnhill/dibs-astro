// Pure release-policy core: answers "which assets are eligible for publication?" from an
// in-memory icon inventory and attribution manifest. No filesystem, process, or CLI
// dependencies. The build shell and the pack-contract verifier both consume this module's
// output instead of independently reinterpreting release-decision rules.

export const RELEASE_POLICY_FINDING_CODES = Object.freeze({
    MISSING_MANIFEST_ASSET: "releasePolicy.missingManifestAsset",
    UNKNOWN_MANIFEST_ASSET: "releasePolicy.unknownManifestAsset",
    NOT_PERMITTED: "releasePolicy.notPermitted",
});

const PERMITTED_CONCLUSION = "permitted";
const INCLUDE_ACTION = "include";

/**
 * Centralizes the "is this manifest asset marked include?" predicate so no other script needs
 * to re-derive it from `releaseDecision.action` directly.
 *
 * @param {object} asset
 * @returns {boolean}
 */
export const isIncludedAction = (asset) => asset?.releaseDecision?.action === INCLUDE_ACTION;

/**
 * Centralizes the "does this manifest asset have permitted redistribution?" predicate.
 *
 * @param {object} asset
 * @returns {boolean}
 */
export const hasPermittedRedistribution = (asset) =>
    asset?.redistribution?.conclusion === PERMITTED_CONCLUSION;

const getManifestAssets = (manifest) => Array.isArray(manifest?.assets) ? manifest.assets : [];

function indexManifestByFile(manifest) {
    const byFile = new Map();
    for (const asset of getManifestAssets(manifest)) {
        if (typeof asset?.file === "string") {
            byFile.set(asset.file, asset);
        }
    }
    return byFile;
}

/**
 * Finds manifest assets that reference a file absent from the inventory.
 *
 * @param {object} manifest
 * @param {Set<string>} inventoryFiles
 * @returns {{ code: string, file: string }[]}
 */
function findUnknownManifestAssets(manifest, inventoryFiles) {
    return getManifestAssets(manifest)
        .map((asset) => asset?.file)
        .filter((file) => typeof file === "string" && !inventoryFiles.has(file))
        .sort()
        .map((file) => ({
            code: RELEASE_POLICY_FINDING_CODES.UNKNOWN_MANIFEST_ASSET,
            file,
        }));
}

/**
 * Resolves a single custom-group inventory icon against its manifest evidence.
 *
 * @param {{ file: string }} icon
 * @param {Map<string, object>} manifestByFile
 * @returns {{ publish?: true, finding?: { code: string, file: string } }}
 */
function resolveCustomIcon(icon, manifestByFile) {
    const asset = manifestByFile.get(icon.file);
    if (!asset) {
        return {
            finding: { code: RELEASE_POLICY_FINDING_CODES.MISSING_MANIFEST_ASSET, file: icon.file },
        };
    }

    if (!isIncludedAction(asset)) {
        // "exclude" and "pending" are both silently not publishable; neither is a policy error.
        return {};
    }

    if (hasPermittedRedistribution(asset)) {
        return { publish: true };
    }

    return { finding: { code: RELEASE_POLICY_FINDING_CODES.NOT_PERMITTED, file: icon.file } };
}

const sortFindings = (findings) =>
    [...findings].sort((a, b) => a.code.localeCompare(b.code) || a.file.localeCompare(b.file));

const sortIcons = (icons) => [...icons].sort((a, b) => a.file.localeCompare(b.file));

/**
 * Derives the publishable asset set from an inventory and an attribution manifest.
 *
 * Policy:
 * - a "phosphor" inventory member is always publishable (baseline);
 * - a "custom" asset with `releaseDecision.action === "include"` and
 *   `redistribution.conclusion === "permitted"` is publishable;
 * - a "custom" asset with action "exclude" or "pending" is not publishable (no finding);
 * - a "custom" asset with action "include" but redistribution not permitted is a policy finding;
 * - a "custom" inventory member with no manifest evidence is a policy finding;
 * - a manifest asset referencing an unknown inventory file is a policy finding.
 *
 * Deterministic: output is sorted by filename regardless of input ordering, and unrelated
 * manifest properties never change the result.
 *
 * @param {{
 *   inventory: { icons: { file: string, exportName: string, group: "custom" | "phosphor" }[] },
 *   manifest: { assets?: object[] },
 * }} options
 * @returns {{
 *   publishableIcons: { file: string, exportName: string }[],
 *   findings: { code: string, file: string }[],
 * }}
 */
export function derivePublishableIcons({ inventory, manifest }) {
    const manifestByFile = indexManifestByFile(manifest);
    const inventoryFiles = new Set(inventory.icons.map((icon) => icon.file));

    const publishable = [];
    const findings = [...findUnknownManifestAssets(manifest, inventoryFiles)];

    for (const icon of inventory.icons) {
        if (icon.group === "phosphor") {
            publishable.push(icon);
            continue;
        }

        const { publish, finding } = resolveCustomIcon(icon, manifestByFile);
        if (publish) {
            publishable.push(icon);
        }
        if (finding) {
            findings.push(finding);
        }
    }

    return {
        publishableIcons: sortIcons(publishable).map(({ file, exportName }) => ({ file, exportName })),
        findings: sortFindings(findings),
    };
}

/**
 * Pure set-difference between an expected and an actual filename collection. Used both to
 * demonstrate why equal cardinality does not imply equal membership, and to compare the actual
 * packaged SVG set against the release-policy-derived expectation.
 *
 * @param {Iterable<string>} expectedFiles
 * @param {Iterable<string>} actualFiles
 * @returns {{ missing: string[], unexpected: string[] }}
 */
export function diffAssetFileSets(expectedFiles, actualFiles) {
    const expected = new Set(expectedFiles);
    const actual = new Set(actualFiles);

    return {
        missing: [...expected].filter((file) => !actual.has(file)).sort(),
        unexpected: [...actual].filter((file) => !expected.has(file)).sort(),
    };
}
