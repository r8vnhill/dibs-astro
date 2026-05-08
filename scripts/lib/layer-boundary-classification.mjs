import { normalizeProjectPath } from "./layer-boundary-paths.mjs";

/**
 * @typedef {
 *   | "domain"
 *   | "application"
 *   | "infrastructure"
 *   | "presentation-adapter"
 *   | "ui"
 *   | "content-core"
 *   | "site-core"
 *   | "unknown"
 * } SourceLayer
 */

/**
 * @typedef {
 *   | "domain"
 *   | "application"
 *   | "infrastructure"
 *   | "presentation-adapter"
 *   | "presentation"
 *   | "ui"
 *   | "generated-data"
 *   | "data"
 *   | "utils"
 *   | "assets"
 *   | "styles"
 *   | "content-core"
 *   | "site-core"
 *   | "external-package"
 *   | "unknown"
 * } ImportTarget
 */

/**
 * @typedef {"value" | "type"} ClassifiedImportKind
 */

const scopedPackagePattern = /^@[^/]+\/[^/]+/;

function isUnder(pathValue, prefix) {
    return pathValue === prefix || pathValue.startsWith(`${prefix}/`);
}

function isDomainSource(pathValue) {
    return isUnder(pathValue, "src/domain");
}

function isApplicationSource(pathValue) {
    return isUnder(pathValue, "src/application");
}

function isInfrastructureSource(pathValue) {
    return isUnder(pathValue, "src/infrastructure");
}

function isPresentationAdapterSource(pathValue) {
    return isUnder(pathValue, "src/presentation/adapters");
}

function isUiSource(pathValue) {
    return ["src/components", "src/layouts", "src/pages"].some((prefix) =>
        isUnder(pathValue, prefix)
    );
}

function isContentCoreSource(pathValue) {
    return isUnder(pathValue, "packages/content-core/src");
}

function isSiteCoreSource(pathValue) {
    return isUnder(pathValue, "packages/site-core/src");
}

function isDomainTarget(pathValue) {
    return isUnder(pathValue, "src/domain");
}

function isApplicationTarget(pathValue) {
    return isUnder(pathValue, "src/application");
}

function isInfrastructureTarget(pathValue) {
    return isUnder(pathValue, "src/infrastructure");
}

function isPresentationAdapterTarget(pathValue) {
    return isUnder(pathValue, "src/presentation/adapters");
}

function isPresentationTarget(pathValue) {
    return isUnder(pathValue, "src/presentation");
}

function isUiTarget(pathValue) {
    return ["src/components", "src/layouts", "src/pages"].some((prefix) =>
        isUnder(pathValue, prefix)
    );
}

function isGeneratedDataTarget(pathValue) {
    return isUnder(pathValue, "src/data")
        && (pathValue.endsWith(".generated.json") || pathValue.endsWith(".generated.jsonld"));
}

function isDataTarget(pathValue) {
    return isUnder(pathValue, "src/data");
}

function isUtilsTarget(pathValue) {
    return isUnder(pathValue, "src/utils");
}

function isAssetsTarget(pathValue) {
    return isUnder(pathValue, "src/assets");
}

function isStylesTarget(pathValue) {
    return isUnder(pathValue, "src/styles");
}

function isContentCoreTarget(pathValue) {
    return isUnder(pathValue, "packages/content-core/src");
}

function isSiteCoreTarget(pathValue) {
    return isUnder(pathValue, "packages/site-core/src");
}

const SOURCE_LAYERS = Object.freeze([
    ["domain", isDomainSource],
    ["application", isApplicationSource],
    ["infrastructure", isInfrastructureSource],
    ["presentation-adapter", isPresentationAdapterSource],
    ["ui", isUiSource],
    ["content-core", isContentCoreSource],
    ["site-core", isSiteCoreSource],
]);

const TARGETS = Object.freeze([
    ["presentation-adapter", isPresentationAdapterTarget],
    ["generated-data", isGeneratedDataTarget],
    ["domain", isDomainTarget],
    ["application", isApplicationTarget],
    ["infrastructure", isInfrastructureTarget],
    ["presentation", isPresentationTarget],
    ["ui", isUiTarget],
    ["data", isDataTarget],
    ["utils", isUtilsTarget],
    ["assets", isAssetsTarget],
    ["styles", isStylesTarget],
    ["content-core", isContentCoreTarget],
    ["site-core", isSiteCoreTarget],
]);

function isRelativeImport(importPath) {
    return importPath.startsWith(".");
}

function isProjectAliasImport(importPath) {
    return importPath === "~" || importPath.startsWith("~/") || /^\$[^/]*(?:\/|$)/.test(importPath);
}

function isBarePackageImport(importPath) {
    return !isRelativeImport(importPath)
        && !isProjectAliasImport(importPath)
        && !importPath.startsWith("/")
        && !importPath.startsWith("src/");
}

function importPathFrom(importRecord) {
    return importRecord.importPath ?? importRecord.target;
}

function classifiedImportKind(kind) {
    return kind === "type-import" || kind === "type-re-export" ? "type" : "value";
}

/**
 * @param {string} sourcePath
 * @returns {{ path: string; layer: SourceLayer }}
 */
export function classifySourcePath(sourcePath) {
    const normalizedPath = normalizeProjectPath(sourcePath);
    const match = SOURCE_LAYERS.find(([, predicate]) => predicate(normalizedPath));

    return {
        path: normalizedPath,
        layer: match?.[0] ?? "unknown",
    };
}

/**
 * @param {string} resolvedPath
 * @returns {Exclude<ImportTarget, "external-package">}
 */
export function classifyResolvedTarget(resolvedPath) {
    const normalizedPath = normalizeProjectPath(resolvedPath);
    const match = TARGETS.find(([, predicate]) => predicate(normalizedPath));

    return match?.[0] ?? "unknown";
}

/**
 * @param {string} importPath
 * @returns {{ target: "external-package"; packageName: string }}
 */
export function classifyPackageImport(importPath) {
    const packageName = importPath.startsWith("@")
        ? importPath.match(scopedPackagePattern)?.[0] ?? importPath
        : importPath.split("/")[0];

    return {
        target: "external-package",
        packageName,
    };
}

/**
 * @param {{ importPath?: string; target?: string; kind: string }} importRecord
 * @param {string | undefined} resolvedPath
 * @returns {{
 *   importPath: string;
 *   importKind: ClassifiedImportKind;
 *   resolvedPath?: string;
 *   packageName?: string;
 *   target: ImportTarget;
 * }}
 */
export function classifyImport(importRecord, resolvedPath) {
    const importPath = importPathFrom(importRecord);
    const importKind = classifiedImportKind(importRecord.kind);

    if (resolvedPath) {
        const normalizedPath = normalizeProjectPath(resolvedPath);
        return {
            importPath,
            importKind,
            resolvedPath: normalizedPath,
            target: classifyResolvedTarget(normalizedPath),
        };
    }

    if (isBarePackageImport(importPath)) {
        return { importPath, importKind, ...classifyPackageImport(importPath) };
    }

    return { importPath, importKind, target: "unknown" };
}
