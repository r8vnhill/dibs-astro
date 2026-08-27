import {
    classifyImportKind,
    classifyPackageImport as classifyExternalPackageImport,
    classifyUnresolvedImport as classifyExternalUnresolvedImport,
    extractImportPath,
} from "./import-specifiers.mjs";
import { normalizeProjectPath } from "./paths.mjs";

/**
 * @typedef {
 *   | "domain"
 *   | "application"
 *   | "infrastructure"
 *   | "presentation-adapter"
 *   | "ui"
 *   | "content-core"
 *   | "site-shell"
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
 *   | "site-shell"
 *   | "external-source"
 *   | "external-package"
 *   | "unknown"
 * } ImportTarget
 */

/**
 * @typedef {"value" | "type"} ClassifiedImportKind
 */

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
    return ["src/components", "src/layouts", "src/pages"].some((prefix) => isUnder(pathValue, prefix));
}

function isContentCoreSource(pathValue) {
    return isUnder(pathValue, "packages/content-core/src");
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
    return ["src/components", "src/layouts", "src/pages"].some((prefix) => isUnder(pathValue, prefix));
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

function isExternalSourceTarget(pathValue) {
    return isUnder(pathValue, "vendor");
}

const SOURCE_LAYERS = Object.freeze([
    ["domain", isDomainSource],
    ["application", isApplicationSource],
    ["infrastructure", isInfrastructureSource],
    ["presentation-adapter", isPresentationAdapterSource],
    ["ui", isUiSource],
    ["content-core", isContentCoreSource],
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
    ["external-source", isExternalSourceTarget],
]);

/**
 * Architectural packages retain their dependency role independently from the source ownership of their files.
 *
 * `site-core` is published and external to this repository, while `content-core` remains a local package.
 * Both packages are still architectural targets and expose only their package roots to consumers.
 */
export const architecturalPackages = Object.freeze([
    Object.freeze({
        packageName: "@ravenhill/content-core",
        semanticTarget: "content-core",
        sourceOwnership: "local",
        importSurface: "root-only",
    }),
    Object.freeze({
        packageName: "@ravenhill/site-core",
        semanticTarget: "site-core",
        sourceOwnership: "external",
        importSurface: "root-only",
    }),
    Object.freeze({
        packageName: "@ravenhill/astro-site-shell",
        semanticTarget: "site-shell",
        sourceOwnership: "external",
        importSurface: "root-only",
    }),
    Object.freeze({
        packageName: "@ravenhill/astro-head",
        semanticTarget: "astro-head",
        sourceOwnership: "external",
        importSurface: "root-only",
    }),
    Object.freeze({
        packageName: "@ravenhill/astro-site-chrome",
        semanticTarget: "astro-site-chrome",
        sourceOwnership: "external",
        importSurface: "root-only",
    }),
]);

function architecturalPackageFor(packageName) {
    return architecturalPackages.find((entry) => entry.packageName === packageName);
}

function classifyArchitecturalPackage(genericClassification) {
    if (genericClassification.target !== "external-package") {
        return genericClassification;
    }

    const architecturalPackage = architecturalPackageFor(genericClassification.packageName);

    return architecturalPackage
        ? { ...genericClassification, target: architecturalPackage.semanticTarget }
        : genericClassification;
}

export function classifyPackageImport(importPath) {
    return classifyArchitecturalPackage(classifyExternalPackageImport(importPath));
}

export function classifyUnresolvedImport(importPath) {
    return classifyArchitecturalPackage(classifyExternalUnresolvedImport(importPath));
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

export { classifyImportKind, extractImportPath };

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
    const importPath = extractImportPath(importRecord);
    const importKind = classifyImportKind(importRecord.kind);

    if (resolvedPath) {
        const normalizedPath = normalizeProjectPath(resolvedPath);
        const resolvedTarget = classifyResolvedTarget(normalizedPath);
        const packageClassification = classifyUnresolvedImport(importPath);
        const architecturalPackage = architecturalPackageFor(packageClassification.packageName);
        const target = resolvedTarget === "unknown" && architecturalPackage
            ? architecturalPackage.semanticTarget
            : resolvedTarget;

        return {
            importPath,
            importKind,
            resolvedPath: normalizedPath,
            ...(target === architecturalPackage?.semanticTarget && architecturalPackage
                ? { packageName: architecturalPackage.packageName }
                : {}),
            target,
        };
    }

    return { importPath, importKind, ...classifyUnresolvedImport(importPath) };
}
