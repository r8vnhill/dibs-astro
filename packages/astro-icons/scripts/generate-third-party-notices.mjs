// Pure notice renderer: turns the frozen third-party-icons.json manifest into deterministic
// Markdown for LICENSES/THIRD_PARTY.md. No filesystem, process, or CLI dependencies.

const withSingleTrailingNewline = (value) => `${value.replace(/\n+$/u, "")}\n`;

const getRenderableAssets = (manifest) =>
    Array.isArray(manifest?.assets) ? manifest.assets : [];

/**
 * Renders trademark information only when the manifest asserts trademark applicability.
 *
 * @param {{ applies?: string, owner?: string|null, policyUrl?: string|null, notes?: string|null }} trademark
 * @returns {string}
 */
export function renderTrademarkNotice(trademark) {
    if (!trademark || trademark.applies !== "yes") {
        return "";
    }

    const parts = [];
    if (trademark.owner) {
        parts.push(`Trademark: ${trademark.owner}.`);
    }
    if (trademark.policyUrl) {
        parts.push(`Policy: ${trademark.policyUrl}.`);
    }
    if (trademark.notes) {
        parts.push(`Notes: ${trademark.notes}.`);
    }

    return parts.join(" ");
}

/**
 * Renders a single non-Phosphor asset section using conservative, manifest-literal wording.
 *
 * @param {object} asset
 * @returns {string}
 */
export function renderAssetSection(asset) {
    const lines = [
        `## ${asset.displayName}`,
        "",
        `- File: \`${asset.file}\``,
        `- Asset type: ${asset.assetType}`,
        `- Copyright conclusion: ${asset.rights?.copyright?.concludedLicense}`,
    ];

    if (asset.rights?.copyright?.basis) {
        lines.push(`- Copyright basis: ${asset.rights.copyright.basis}`);
    }

    lines.push(
        `- Redistribution conclusion: ${asset.redistribution?.conclusion}`,
        `- Recorded release decision: ${asset.releaseDecision?.action}`,
    );

    const trademarkNotice = renderTrademarkNotice(asset.rights?.trademark);
    if (trademarkNotice) {
        lines.push(`- ${trademarkNotice}`);
    }

    return lines.join("\n");
}

/**
 * Renders the Phosphor attribution section, stating source evidence status honestly rather than
 * implying a verified upstream commit when none exists.
 *
 * @param {object} phosphor
 * @returns {string}
 */
export const renderPhosphorSection = (phosphor) =>
    [
        `## ${phosphor.project}`,
        "",
        `- Concluded license: ${phosphor.copyright?.concludedLicense}`,
        `- Copyright notice: ${phosphor.copyright?.copyrightNotice}`,
        `- Source evidence status: ${phosphor.source?.evidenceStatus}.`,
        "- See LICENSES/PHOSPHOR.txt for the full notice.",
    ].join("\n");

/**
 * Renders the complete deterministic third-party notice: a fixed title, the Phosphor section,
 * then one section per manifest asset sorted by file name.
 *
 * @param {object} manifest
 * @returns {string}
 */
export function renderThirdPartyNotice(manifest) {
    const assets = [...getRenderableAssets(manifest)].sort((a, b) =>
        a.file.localeCompare(b.file),
    );

    const sections = [
        "# Third-Party Notices",
        "",
        renderPhosphorSection(manifest.phosphor),
        "",
        ...assets.flatMap((asset) => [renderAssetSection(asset), ""]),
    ];

    return withSingleTrailingNewline(sections.join("\n"));
}
