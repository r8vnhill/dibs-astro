// Pure attribution manifest validator: treats the frozen third-party-icons.json manifest as
// ground truth and reports every contract infringement at once. No filesystem, process, or CLI
// dependencies.

export const RELEASE_DECISION_ACTIONS = Object.freeze([
    "include",
    "exclude",
    "pending",
]);

export const REDISTRIBUTION_CONCLUSIONS = Object.freeze([
    "permitted",
    "restricted",
    "permission-required",
    "undetermined",
]);

const PLACEHOLDER_PATTERNS = Object.freeze([
    /tbd/iu,
    /<source>/iu,
    /to verify/iu,
    /probably/iu,
    /assumed/iu,
]);

const LICENSE_FILE_REFERENCE_PATHS = Object.freeze([
    Object.freeze(["rights", "copyright", "licenseFile"]),
    Object.freeze(["rights", "trademark", "licenseFile"]),
    Object.freeze(["rights", "trademark", "permissionFile"]),
    Object.freeze(["rights", "trademark", "policyFile"]),
]);

const getAssetLabel = (asset, index) => asset?.file ?? `asset[${index}]`;

const getAtPath = (object, path) =>
    path.reduce(
        (value, key) => (value == null ? undefined : value[key]),
        object,
    );

const formatPath = (path) =>
    path.reduce((rendered, segment, index) => {
        if (typeof segment === "number") {
            return `${rendered}[${segment}]`;
        }
        return index === 0 ? `${segment}` : `${rendered}.${segment}`;
    }, "");

function collectStringFields(value, path = []) {
    if (typeof value === "string") {
        return [{ path, value }];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry, index) =>
            collectStringFields(entry, [...path, index]),
        );
    }
    if (value !== null && typeof value === "object") {
        return Object.entries(value).flatMap(([key, entry]) =>
            collectStringFields(entry, [...path, key]),
        );
    }
    return [];
}

/**
 * Reports missing inventory files, unexpected manifest files, and duplicate manifest file
 * entries, all in one call.
 *
 * @param {Iterable<string>} customInventoryFiles
 * @param {{ file: string }[]} assets
 * @returns {string[]}
 */
export function validateAttributionCoverage(customInventoryFiles, assets) {
    const inventorySet = new Set(customInventoryFiles);
    const assetFiles = assets.map((asset) => asset.file);
    const assetFileSet = new Set(assetFiles);

    const missing = [...inventorySet]
        .filter((file) => !assetFileSet.has(file))
        .sort();
    const unexpected = [...assetFileSet]
        .filter((file) => !inventorySet.has(file))
        .sort();

    const seen = new Set();
    const duplicates = new Set();
    for (const file of assetFiles) {
        if (seen.has(file)) {
            duplicates.add(file);
        }
        seen.add(file);
    }

    return [
        ...missing.map((file) => `coverage.missing: ${file}`),
        ...unexpected.map((file) => `coverage.unexpected: ${file}`),
        ...[...duplicates].sort().map((file) => `coverage.duplicate: ${file}`),
    ];
}

/**
 * Rejects any `releaseDecision.action` or `redistribution.conclusion` value outside the frozen
 * vocabularies.
 *
 * @param {object[]} assets
 * @returns {string[]}
 */
export function validateReleaseDecisions(assets) {
    const actionSet = new Set(RELEASE_DECISION_ACTIONS);
    const conclusionSet = new Set(REDISTRIBUTION_CONCLUSIONS);
    const findings = [];

    assets.forEach((asset, index) => {
        const label = getAssetLabel(asset, index);
        const action = asset?.releaseDecision?.action;
        if (!actionSet.has(action)) {
            findings.push(
                `releaseDecision.action.unsupported: ${label} -> ${action}`,
            );
        }

        const conclusion = asset?.redistribution?.conclusion;
        if (!conclusionSet.has(conclusion)) {
            findings.push(
                `redistribution.conclusion.unsupported: ${label} -> ${conclusion}`,
            );
        }
    });

    return findings;
}

/**
 * Recursively scans every string field of every asset, case-insensitively, for residual
 * placeholder or uncertainty wording.
 *
 * @param {object[]} assets
 * @returns {string[]}
 */
export function validatePlaceholders(assets) {
    const findings = [];

    assets.forEach((asset, index) => {
        const label = getAssetLabel(asset, index);
        for (const { path, value } of collectStringFields(asset)) {
            if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
                findings.push(
                    `placeholder.found: ${label} ${formatPath(path)} -> ${value}`,
                );
            }
        }
    });

    return findings;
}

/**
 * Checks that any non-null license-file reference points to a filename supplied by the caller.
 * Takes the existing filename set as a parameter; performs no filesystem access itself.
 *
 * @param {object[]} assets
 * @param {Iterable<string>} existingLicenseFileNames
 * @returns {string[]}
 */
export function validateLicenseFileReferences(
    assets,
    existingLicenseFileNames,
) {
    const existing = new Set(existingLicenseFileNames);
    const findings = [];

    assets.forEach((asset, index) => {
        const label = getAssetLabel(asset, index);
        for (const path of LICENSE_FILE_REFERENCE_PATHS) {
            const reference = getAtPath(asset, path);
            if (reference != null && !existing.has(reference)) {
                findings.push(
                    `licenseFile.missing: ${label} ${path.join(".")} -> ${reference}`,
                );
            }
        }
    });

    return findings;
}

const getManifestAssets = (manifest) =>
    Array.isArray(manifest?.assets) ? manifest.assets : [];

function getCustomInventoryFiles(inventory) {
    const icons = Array.isArray(inventory?.icons) ? inventory.icons : [];
    return icons
        .filter((icon) => icon.group === "custom")
        .map((icon) => icon.file);
}

/**
 * Composes every specialized validator into one result, collecting all findings rather than
 * stopping at the first failure.
 *
 * @param {object} inventory - frozen icon-inventory.json shape (`{ icons: [{ file, group }] }`)
 * @param {object} manifest - frozen third-party-icons.json shape (`{ assets: [...] }`)
 * @param {Iterable<string>} existingLicenseFileNames
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function validateManifest(
    inventory,
    manifest,
    existingLicenseFileNames,
) {
    const assets = getManifestAssets(manifest);
    const customInventoryFiles = getCustomInventoryFiles(inventory);

    const findings = [
        ...validateAttributionCoverage(customInventoryFiles, assets),
        ...validateReleaseDecisions(assets),
        ...validatePlaceholders(assets),
        ...validateLicenseFileReferences(assets, existingLicenseFileNames),
    ];

    return {
        ok: findings.length === 0,
        findings,
    };
}
